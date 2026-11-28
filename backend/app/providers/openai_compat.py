import asyncio
import base64
import io
from collections.abc import Awaitable, Callable

import httpx
from PIL import Image, ImageFilter

from app.config import get_settings
from app.providers.base import (
    EditRequest,
    GenerateRequest,
    ImageProvider,
    ProgressCallback,
    ProviderError,
)

_GENERATE_PATH = "/images/generations"
_EDIT_PATH = "/images/edits"
_TIMEOUT = 300.0
_TICK = 2.0
# 上传前把长边压到模型工作分辨率附近，避免几 MB 的 PNG 白白占带宽
_UPLOAD_EDGE = 2048
_MAX_UPSCALE_EDGE = 4096
_PAD_HINT = (
    "原图位于画面中央，四周模糊的部分是需要补全的区域："
    "把它画成与原图自然衔接的真实画面，原图部分保持不变。"
)
_CANVAS_HINT = "第一张是空白画布，在它的画幅上作画；后面几张是参考图，按要求参考其中的内容。"
# 网关对方图请求也可能回横图，要居中裁切，所以提示模型把主体放中间
_SQUARE_HINT = "画面比例 1:1，主体放在画面中央。"
_UPSCALE_PROMPT = "提高清晰度，去掉噪点和压缩痕迹，保持主体、构图和颜色不变，不要添加新元素。"


class OpenAIImageProvider(ImageProvider):
    """OpenAI 兼容的图像接口（gpt-image 系列），也可经兼容网关转发。

    部分兼容网关不支持 n，一次只回一张，多张要并发请求；文生图只出横竖两种画幅，
    编辑大致保持输入的宽高比。所以结果一律按目标尺寸居中裁切缩放，调用方拿到的尺寸与请求一致。
    """

    name = "openai"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openai_api_key or not settings.openai_base_url:
            raise ProviderError("未配置 OPENAI_API_KEY 或 OPENAI_BASE_URL")
        self._model = settings.openai_image_model
        self._client = httpx.AsyncClient(
            base_url=settings.openai_base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            timeout=_TIMEOUT,
        )

    async def generate(
        self, request: GenerateRequest, on_progress: ProgressCallback | None = None
    ) -> list[bytes]:
        prompt = _prompt(request.prompt, request.negative_prompt)
        size = api_size(request.width, request.height)
        if size == "1024x1024":
            prompt = f"{prompt}\n{_SQUARE_HINT}"
        references = [_upload(_open(raw)) for raw in request.references]
        if references:
            # 编辑接口按第一张图的比例出图；垫一张目标比例的空白画布，参考图放在后面
            blank = Image.new("RGB", _blank_size(request.width, request.height), "white")
            references = [_png(blank), *references]
            prompt = f"{_CANVAS_HINT}\n{prompt}"

        async def once() -> bytes:
            if references:
                return await self._edit_once(references, prompt, size)
            return await self._generate_once(prompt, size)

        images = await _run(once, request.count, on_progress, "生成中")
        return [cover(data, request.width, request.height) for data in images]

    async def edit(
        self, request: EditRequest, on_progress: ProgressCallback | None = None
    ) -> list[bytes]:
        source = _open(request.image)
        width = request.width or source.width
        height = request.height or source.height
        prompt = _prompt(request.prompt, request.negative_prompt)
        image = source
        if not _same_ratio(source.size, (width, height)):
            # 编辑接口沿用输入的宽高比，扩图要先把画布铺到目标比例
            image = pad(source, width, height)
            prompt = f"{prompt}\n{_PAD_HINT}"
        upload = _upload(image)

        async def once() -> bytes:
            return await self._edit_once([upload], prompt, api_size(width, height))

        images = await _run(once, request.count, on_progress, "编辑中")
        return [cover(data, width, height) for data in images]

    async def upscale(
        self, image: bytes, scale: int, on_progress: ProgressCallback | None = None
    ) -> bytes:
        source = _open(image)
        width, height = upscaled_size(source.width, source.height, scale)
        upload = _upload(source)

        async def once() -> bytes:
            return await self._edit_once([upload], _UPSCALE_PROMPT, api_size(width, height))

        images = await _run(once, 1, on_progress, "提升分辨率")
        return cover(images[0], width, height)

    async def _generate_once(self, prompt: str, size: str) -> bytes:
        payload = {"model": self._model, "prompt": prompt, "size": size, "n": 1}
        return await self._image_of(lambda: self._client.post(_GENERATE_PATH, json=payload))

    async def _edit_once(self, images: list[bytes], prompt: str, size: str) -> bytes:
        field = "image" if len(images) == 1 else "image[]"
        files = [(field, (f"image{i}.png", data, "image/png")) for i, data in enumerate(images)]
        form = {"model": self._model, "prompt": prompt, "size": size, "n": "1"}
        return await self._image_of(lambda: self._client.post(_EDIT_PATH, data=form, files=files))

    async def _image_of(self, send: Callable[[], Awaitable[httpx.Response]]) -> bytes:
        try:
            response = await send()
        except httpx.TimeoutException as exc:
            raise ProviderError("图像服务响应超时") from exc
        except httpx.HTTPError as exc:
            raise ProviderError("图像服务连接失败") from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise ProviderError(f"图像服务返回非 JSON 响应（HTTP {response.status_code}）") from exc

        if response.status_code != httpx.codes.OK:
            raise ProviderError(_error_message(body) or f"图像服务错误 HTTP {response.status_code}")

        items = body.get("data") or []
        if not items:
            raise ProviderError("图像服务未返回图片")
        item = items[0]
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"])
        if item.get("url"):
            async with httpx.AsyncClient(timeout=60.0) as client:
                downloaded = await client.get(item["url"])
            if downloaded.status_code != httpx.codes.OK:
                raise ProviderError("生成结果下载失败")
            return downloaded.content
        raise ProviderError("图像服务返回了无法识别的结果")


async def _run(
    once: Callable[[], Awaitable[bytes]],
    count: int,
    on_progress: ProgressCallback | None,
    stage: str,
) -> list[bytes]:
    """并发出 count 张，等待期间按耗时推进进度。

    进度回调与等待在同一协程里串行执行，不会和调用方同时使用数据库会话。
    """
    work = asyncio.ensure_future(asyncio.gather(*(once() for _ in range(count))))
    if on_progress is None:
        return list(await work)

    loop = asyncio.get_running_loop()
    started = loop.time()
    try:
        await on_progress(20, stage)
        while True:
            done, _ = await asyncio.wait({work}, timeout=_TICK)
            if done:
                return list(work.result())
            waited = loop.time() - started
            await on_progress(min(85, 25 + int(waited * 3)), stage)
    finally:
        if not work.done():
            work.cancel()


def api_size(width: int, height: int) -> str:
    """接口只认三种画幅，取比例最接近的一种。"""
    ratio = width / height
    if ratio > 1.2:
        return "1536x1024"
    if ratio < 1 / 1.2:
        return "1024x1536"
    return "1024x1024"


def cover(data: bytes, width: int, height: int) -> bytes:
    """居中裁切并缩放到目标尺寸，不留边。"""
    image = _open(data)
    if image.size != (width, height):
        scale = max(width / image.width, height / image.height)
        size = (max(width, round(image.width * scale)), max(height, round(image.height * scale)))
        image = image.resize(size, Image.Resampling.LANCZOS)
        left, top = (size[0] - width) // 2, (size[1] - height) // 2
        image = image.crop((left, top, left + width, top + height))
    return _png(image)


def pad(source: Image.Image, width: int, height: int) -> Image.Image:
    """原图完整居中放进目标画幅，四周铺一层同色调的模糊底，给模型补全时参照。"""
    rgba = source.convert("RGBA")
    backdrop = _open(cover(_png(rgba), width, height)).convert("RGBA")
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(max(width, height) / 40))
    scale = min(width / rgba.width, height / rgba.height)
    size = (max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale)))
    placed = rgba.resize(size, Image.Resampling.LANCZOS) if size != rgba.size else rgba
    backdrop.paste(placed, ((width - size[0]) // 2, (height - size[1]) // 2), placed)
    return backdrop


def upscaled_size(width: int, height: int, scale: int) -> tuple[int, int]:
    width, height = width * scale, height * scale
    long_edge = max(width, height)
    if long_edge > _MAX_UPSCALE_EDGE:
        factor = _MAX_UPSCALE_EDGE / long_edge
        width, height = round(width * factor), round(height * factor)
    return max(1, width), max(1, height)


def _blank_size(width: int, height: int) -> tuple[int, int]:
    scale = 1024 / max(width, height)
    return max(1, round(width * scale)), max(1, round(height * scale))


def _same_ratio(a: tuple[int, int], b: tuple[int, int]) -> bool:
    return abs(a[0] / a[1] - b[0] / b[1]) < 0.01


def _prompt(prompt: str, negative: str | None) -> str:
    return f"{prompt}\n避免：{negative}" if negative else prompt


def _error_message(body: object) -> str | None:
    if not isinstance(body, dict):
        return None
    error = body.get("error")
    if isinstance(error, dict):
        return error.get("message")
    return body.get("message")


def _open(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    image.load()
    return image


def _upload(image: Image.Image) -> bytes:
    if max(image.size) > _UPLOAD_EDGE:
        image = image.copy()
        image.thumbnail((_UPLOAD_EDGE, _UPLOAD_EDGE), Image.Resampling.LANCZOS)
    return _png(image)


def _png(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
