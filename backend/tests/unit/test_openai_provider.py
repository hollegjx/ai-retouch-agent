import base64
import json
from io import BytesIO

import httpx
import pytest
from PIL import Image

from app.agent import llm
from app.config import get_settings
from app.providers import EditRequest, GenerateRequest, ProviderError
from app.providers.openai_compat import OpenAIImageProvider, api_size, cover, upscaled_size


def _png(size: tuple[int, int], color=(30, 120, 200)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _size(data: bytes) -> tuple[int, int]:
    return Image.open(BytesIO(data)).size


class _Gateway:
    """模拟一个兼容网关：忽略 n，一次只回一张，画幅只看 size 参数。"""

    def __init__(self, status: int = 200, body: dict | None = None):
        self.calls: list[httpx.Request] = []
        self.status = status
        self.body = body

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request)
        if self.body is not None:
            return httpx.Response(self.status, json=self.body)
        if request.url.path.endswith("/generations"):
            size = json.loads(request.content)["size"]
        else:
            size = request.content.split(b'name="size"\r\n\r\n')[1].split(b"\r\n")[0].decode()
        width, height = (int(part) for part in size.split("x"))
        encoded = base64.b64encode(_png((width, height))).decode()
        return httpx.Response(200, json={"data": [{"b64_json": encoded}], "size": size})


@pytest.fixture
def provider(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "openai_base_url", "http://gateway/v1/")
    instance = OpenAIImageProvider()
    gateway = _Gateway()

    def use(handler: _Gateway) -> _Gateway:
        instance._client = httpx.AsyncClient(
            base_url="http://gateway/v1",
            headers={"Authorization": "Bearer test-key"},
            transport=httpx.MockTransport(handler),
        )
        return handler

    use(gateway)
    instance.use = use
    instance.gateway = gateway
    return instance


def test_api_size_picks_the_closest_supported_canvas():
    assert api_size(1920, 1080) == "1536x1024"
    assert api_size(1080, 1920) == "1024x1536"
    assert api_size(1080, 1350) == "1024x1536"
    assert api_size(1080, 1080) == "1024x1024"


def test_cover_returns_exact_target_size():
    assert _size(cover(_png((1536, 1024)), 1080, 1080)) == (1080, 1080)
    assert _size(cover(_png((1254, 1254)), 1080, 1920)) == (1080, 1920)


def test_upscale_size_is_capped():
    assert upscaled_size(1000, 500, 2) == (2000, 1000)
    assert max(upscaled_size(3000, 2000, 4)) == 4096


def test_missing_key_is_reported(monkeypatch):
    monkeypatch.setattr(get_settings(), "openai_api_key", "")
    with pytest.raises(ProviderError, match="OPENAI_API_KEY"):
        OpenAIImageProvider()


async def test_generate_sends_one_request_per_image(provider):
    progress = []

    async def report(value, stage):
        progress.append((value, stage))

    images = await provider.generate(
        GenerateRequest(
            prompt="一杯咖啡", width=1080, height=1080, count=3, negative_prompt="文字"
        ),
        report,
    )

    assert len(provider.gateway.calls) == 3
    assert [_size(data) for data in images] == [(1080, 1080)] * 3
    payload = json.loads(provider.gateway.calls[0].content)
    assert payload["n"] == 1
    assert "避免：文字" in payload["prompt"]
    assert "主体放在画面中央" in payload["prompt"]
    assert provider.gateway.calls[0].headers["authorization"] == "Bearer test-key"
    assert progress and progress[0] == (20, "生成中")


async def test_generate_with_references_uses_the_edit_endpoint(provider):
    await provider.generate(
        GenerateRequest(
            prompt="同款换色", width=1920, height=1080, references=[_png((64, 64)), _png((80, 80))]
        )
    )

    call = provider.gateway.calls[0]
    assert call.url.path == "/v1/images/edits"
    # 第一张是目标比例的空白画布，后面才是参考图
    assert call.content.count(b'name="image[]"') == 3
    assert "空白画布".encode() in call.content


async def test_edit_keeps_source_size(provider):
    images = await provider.edit(EditRequest(prompt="换成白底", image=_png((900, 600))))

    assert _size(images[0]) == (900, 600)
    call = provider.gateway.calls[0]
    assert call.url.path == "/v1/images/edits"
    assert b'name="image"' in call.content
    assert "四周模糊".encode() not in call.content


async def test_expanding_pads_the_canvas_before_editing(provider):
    images = await provider.edit(
        EditRequest(prompt="向两侧延伸", image=_png((600, 600)), width=1067, height=600)
    )

    assert _size(images[0]) == (1067, 600)
    content = provider.gateway.calls[0].content
    assert "四周模糊".encode() in content
    assert b"1536x1024" in content


async def test_upscale_returns_scaled_size(provider):
    output = await provider.upscale(_png((500, 400)), 2)

    assert _size(output) == (1000, 800)


async def test_gateway_error_message_reaches_the_user(provider):
    provider.use(_Gateway(status=400, body={"error": {"message": "内容不合规"}}))

    with pytest.raises(ProviderError, match="内容不合规"):
        await provider.edit(EditRequest(prompt="x", image=_png((64, 64))))


async def test_empty_result_is_an_error(provider):
    provider.use(_Gateway(body={"data": []}))

    with pytest.raises(ProviderError, match="未返回图片"):
        await provider.generate(GenerateRequest(prompt="x", width=64, height=64))


def test_planner_can_use_the_openai_gateway(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "planner_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "openai_base_url", "http://gateway/v1")
    monkeypatch.setattr(settings, "planner_model", "gpt-test")
    llm.planner.cache_clear()
    try:
        bound = llm.planner()
        assert bound.bound.model_name == "gpt-test"
        assert bound.bound.openai_api_base == "http://gateway/v1"
    finally:
        llm.planner.cache_clear()


def test_planner_without_key_is_unavailable(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "planner_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    llm.planner.cache_clear()
    try:
        with pytest.raises(llm.PlannerUnavailable, match="OPENAI_API_KEY"):
            llm.planner()
    finally:
        llm.planner.cache_clear()
