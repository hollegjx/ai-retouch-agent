import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import events
from app.exceptions import BusinessError, ErrorCode
from app.models.tool_run import RunStatus, ToolRun
from app.schemas.asset import AssetOut
from app.services import assets as asset_service


class RunNotFound(BusinessError):
    status_code = 404
    code = ErrorCode.NOT_FOUND_ERROR
    message = "任务不存在"


def snapshot(run: ToolRun) -> dict:
    return {
        "id": str(run.id),
        "tool": run.tool,
        "status": run.status,
        "progress": run.progress,
        "stage": run.stage,
        "error": run.error,
        "result": run.result or {},
    }


async def create(
    session: AsyncSession,
    user_id: uuid.UUID,
    tool: str,
    params: dict,
    session_id: uuid.UUID | None = None,
) -> ToolRun:
    run = ToolRun(
        user_id=user_id, session_id=session_id, tool=tool, params=params, stage="等待开始"
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return run


async def get(session: AsyncSession, run_id: uuid.UUID, user_id: uuid.UUID) -> ToolRun:
    run = await session.scalar(
        select(ToolRun).where(ToolRun.id == run_id, ToolRun.user_id == user_id)
    )
    if run is None:
        raise RunNotFound
    return run


async def load(session: AsyncSession, run_id: uuid.UUID) -> ToolRun:
    run = await session.get(ToolRun, run_id)
    if run is None:
        raise RunNotFound
    return run


async def _commit(session: AsyncSession, run: ToolRun) -> None:
    await session.commit()
    await events.publish(run.id, snapshot(run))


async def start(session: AsyncSession, run: ToolRun) -> None:
    run.status = RunStatus.RUNNING
    run.started_at = datetime.now(UTC)
    run.progress = 5
    run.stage = "已开始"
    await _commit(session, run)


async def report(
    session: AsyncSession,
    run: ToolRun,
    progress: int,
    stage: str,
    result: dict | None = None,
) -> None:
    run.progress = max(run.progress, progress)
    run.stage = stage
    if result is not None:
        run.result = result
    await _commit(session, run)


async def finish(
    session: AsyncSession,
    run: ToolRun,
    *,
    status: RunStatus,
    result: dict | None = None,
    error: str | None = None,
) -> None:
    run.status = status
    run.result = result or {}
    run.error = error
    run.progress = 100 if status is RunStatus.SUCCEEDED else run.progress
    run.stage = "已完成" if status is RunStatus.SUCCEEDED else "已结束"
    run.finished_at = datetime.now(UTC)
    await _commit(session, run)


async def candidates(session: AsyncSession, run: ToolRun) -> list[AssetOut]:
    """候选图的签名 URL 有有效期，每次读取时重新签发。"""
    result = []
    for raw in run.result.get("asset_ids", []):
        asset = await asset_service.get_for_user(session, run.user_id, uuid.UUID(raw))
        if asset is not None:
            result.append(AssetOut.of(asset))
    return result
