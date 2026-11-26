import asyncio
import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app import events, storage
from app.edits.mask import overlay_png, rasterize_strokes, to_luma, union
from app.edits.segment import segment_points, warm_embedding
from app.exceptions import BusinessError, ErrorCode
from app.models import EditSession
from app.models.asset import AssetKind, AssetSource
from app.schemas.asset import AssetOut
from app.schemas.session import SelectIn, SelectionOut
from app.services import assets
from app.services.canvas import flatten_session

TTL = 24 * 3600


class StaleSelection(BusinessError):
    status_code = 409
    code = ErrorCode.OPERATION_ERROR
    message = "画布已更新，请重新选择"


class EmptySelection(BusinessError):
    status_code = 422
    code = ErrorCode.PARAMS_ERROR
    message = "选区为空"


def _key(session_id: uuid.UUID) -> str:
    return f"selection:{session_id}"


async def get(session_id: uuid.UUID, revision: int) -> dict | None:
    raw = await events.redis_client().get(_key(session_id))
    if not raw:
        return None
    payload = json.loads(raw)
    if payload.get("revision") != revision:
        return None
    return payload


async def clear(session_id: uuid.UUID) -> None:
    await events.redis_client().delete(_key(session_id))


async def save(session_id: uuid.UUID, payload: dict) -> None:
    await events.redis_client().set(_key(session_id), json.dumps(payload), ex=TTL)


async def prepare(session: AsyncSession, record: EditSession) -> None:
    source = await flatten_session(session, record)
    await asyncio.to_thread(warm_embedding, source)


async def select_points(
    session: AsyncSession,
    record: EditSession,
    revision: int,
    points: list[tuple[float, float]],
    *,
    append: bool,
) -> dict:
    _guard(record, revision)
    if not points:
        raise EmptySelection
    source = await flatten_session(session, record)
    current = await get(record.id, revision) if append else None
    markers = list((current or {}).get("markers") or [])
    if not append:
        markers = []
    for x, y in points:
        markers.append({"index": len(markers) + 1, "x": x, "y": y})
    coords = [(item["x"], item["y"]) for item in markers]
    overlay = await asyncio.to_thread(segment_points, source, coords)
    return await _store(session, record, revision, overlay, markers)


async def select_strokes(
    session: AsyncSession,
    record: EditSession,
    revision: int,
    strokes: list[list[tuple[float, float]]],
    radius: float,
) -> dict:
    _guard(record, revision)
    if not any(strokes):
        raise EmptySelection
    canvas = record.document
    size = (canvas["width"], canvas["height"])
    current = await get(record.id, revision)
    base = None
    markers = list((current or {}).get("markers") or [])
    if current:
        asset_id = uuid.UUID(current["mask_asset_id"])
        asset = await assets.get_for_user(session, record.user_id, asset_id)
        if asset is not None:
            base = to_luma(await storage.get(asset.storage_key), size)
    mask = rasterize_strokes(size, strokes, radius=radius, base=base)
    if base is not None:
        mask = union(base, mask)
    return await _store(session, record, revision, overlay_png(mask), markers)


async def _store(
    session: AsyncSession,
    record: EditSession,
    revision: int,
    overlay: bytes,
    markers: list[dict],
) -> dict:
    asset = await assets.create_from_bytes(
        session, record.user_id, overlay, AssetKind.MASK, AssetSource.TOOL
    )
    payload = {
        "revision": revision,
        "mask_asset_id": str(asset.id),
        "markers": markers,
    }
    await save(record.id, payload)
    return payload


async def mask_bytes(
    session: AsyncSession, record: EditSession, mask_asset_id: str | None
) -> bytes:
    """显式 id 优先，让一轮计划的多个步骤共用同一张遮罩，不受修订号递增影响。"""
    stored = await get(record.id, record.revision)
    asset_id = mask_asset_id or (stored or {}).get("mask_asset_id")
    if not asset_id:
        raise EmptySelection
    asset = await assets.get_for_user(session, record.user_id, uuid.UUID(asset_id))
    if asset is None:
        raise EmptySelection
    canvas = record.document
    # 画幅变了就别把旧遮罩拉伸上去，明确判为失效
    if (asset.width, asset.height) != (canvas["width"], canvas["height"]):
        raise StaleSelection
    return await storage.get(asset.storage_key)


def _guard(record: EditSession, revision: int) -> None:
    if revision != record.revision:
        raise StaleSelection


async def select(session: AsyncSession, record: EditSession, payload: SelectIn) -> SelectionOut:
    if payload.points:
        stored = await select_points(
            session,
            record,
            payload.revision,
            [(point.x, point.y) for point in payload.points],
            append=payload.append,
        )
    elif payload.strokes:
        stored = await select_strokes(
            session,
            record,
            payload.revision,
            [[(point.x, point.y) for point in stroke] for stroke in payload.strokes],
            payload.radius,
        )
    else:
        raise EmptySelection("请点选或涂抹选区")
    return await detail(session, record.user_id, stored)


async def detail(session: AsyncSession, user_id: uuid.UUID, payload: dict) -> SelectionOut:
    mask = await assets.require_for_user(session, user_id, uuid.UUID(payload["mask_asset_id"]))
    return SelectionOut(
        revision=payload["revision"],
        mask=AssetOut.of(mask),
        markers=payload.get("markers") or [],
    )
