import asyncio
import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse

from app import events
from app.db import SessionDep
from app.deps import CurrentUser
from app.models.tool_run import RunStatus
from app.services import runs

router = APIRouter(prefix="/events", tags=["events"])

_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

# 超时后主动断开，客户端重连时会先收到快照，不会丢状态
_MAX_STREAM_SECONDS = 600.0


def _frame(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.get(
    "/runs/{run_id}",
    summary="订阅任务进度",
    description="需要登录且拥有此任务；先发送状态快照，再持续推送 SSE，终态时关闭。",
)
async def stream_run(run_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Response:
    await runs.get(session, run_id, user.id)

    async def stream() -> AsyncIterator[str]:
        # 先订阅再读快照，否则任务在两步之间结束会让连接一直空等
        async with events.subscribe(run_id) as messages:
            run = await runs.get(session, run_id, user.id)
            yield _frame(runs.snapshot(run))
            if run.status.is_terminal:
                return

            deadline = asyncio.get_running_loop().time() + _MAX_STREAM_SECONDS
            async for payload in messages:
                if payload is None:
                    if asyncio.get_running_loop().time() > deadline:
                        return
                    yield ": ping\n\n"
                    continue
                yield _frame(payload)
                if RunStatus(payload["status"]).is_terminal:
                    return

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_HEADERS)
