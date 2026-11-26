import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionDep
from app.deps import CurrentUser
from app.models import EditSession, User
from app.schemas.agent import MessageIn, TurnOut
from app.schemas.export import ExportIn
from app.schemas.run import RunOut
from app.schemas.session import (
    HistoryOut,
    SelectIn,
    SelectionOut,
    SessionCreateIn,
    SessionDetailOut,
    SessionOut,
    SessionPatchIn,
    ToolInvokeIn,
    ToolInvokeOut,
)
from app.services import agent as agent_service
from app.services import exports, selections, sessions, tools

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def _load(session: AsyncSession, user: User, session_id: uuid.UUID) -> EditSession:
    return await sessions.get_for_user(session, session_id, user.id)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="创建编辑会话",
    description="需要登录；所有素材必须属于当前用户，候选图同时加入图片墙。",
)
async def create_session(
    payload: SessionCreateIn, user: CurrentUser, session: SessionDep
) -> SessionDetailOut:
    record = await sessions.create_for_user(session, user.id, payload)
    return await sessions.detail(session, record)


@router.get("", summary="查询我的编辑会话", description="需要登录；按最近更新时间倒序返回。")
async def list_sessions(
    user: CurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(description="最多返回的记录数", ge=1, le=200)] = 50,
) -> list[SessionOut]:
    records = await sessions.list_for_user(session, user.id, limit)
    return [SessionOut.of(record) for record in records]


@router.get(
    "/{session_id}",
    summary="读取编辑会话",
    description="需要登录；返回画布、素材及撤销和重做状态。",
)
async def get_session(
    session_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SessionDetailOut:
    return await sessions.detail(session, await _load(session, user, session_id))


@router.patch(
    "/{session_id}",
    summary="更新编辑会话",
    description="需要登录；标题与当前图片通过归属校验后一次性保存。",
)
async def patch_session(
    session_id: uuid.UUID, payload: SessionPatchIn, user: CurrentUser, session: SessionDep
) -> SessionDetailOut:
    record = await sessions.update_for_user(session, user.id, session_id, payload)
    return await sessions.detail(session, record)


@router.post(
    "/{session_id}/selection/prepare",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="准备智能选区",
    description="需要登录；预热当前画布的图像特征。",
)
async def prepare_selection(session_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> None:
    record = await _load(session, user, session_id)
    await selections.prepare(session, record)


@router.post(
    "/{session_id}/selection",
    summary="创建选区",
    description="需要登录；传入当前画布修订号，支持点选或画笔轨迹。",
)
async def create_selection(
    session_id: uuid.UUID, payload: SelectIn, user: CurrentUser, session: SessionDep
) -> SelectionOut:
    record = await _load(session, user, session_id)
    return await selections.select(session, record, payload)


@router.get(
    "/{session_id}/selection",
    summary="读取选区",
    description="需要登录；没有当前修订版本的选区时返回 null。",
)
async def get_selection(
    session_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SelectionOut | None:
    record = await _load(session, user, session_id)
    stored = await selections.get(record.id, record.revision)
    if stored is None:
        return None
    return await selections.detail(session, user.id, stored)


@router.delete(
    "/{session_id}/selection",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="清除选区",
    description="需要登录；只清除此会话的选区。",
)
async def delete_selection(session_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> None:
    record = await _load(session, user, session_id)
    await selections.clear(record.id)


@router.post(
    "/{session_id}/tools",
    status_code=status.HTTP_202_ACCEPTED,
    summary="执行编辑工具",
    description="需要登录；校验工具参数，返回任务与最新会话。",
)
async def invoke_tool(
    session_id: uuid.UUID, payload: ToolInvokeIn, user: CurrentUser, session: SessionDep
) -> ToolInvokeOut:
    record = await _load(session, user, session_id)
    run = await tools.submit(session, user.id, payload.tool, payload.params, record.id)
    record = await sessions.get_for_user(session, record.id, user.id)
    return ToolInvokeOut(run=RunOut.of(run), session=await sessions.detail(session, record))


@router.post(
    "/{session_id}/undo",
    summary="撤销编辑",
    description="需要登录；恢复上一次画布快照，无可撤销操作时返回冲突。",
)
async def undo_session(
    session_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SessionDetailOut:
    record = await _load(session, user, session_id)
    record = await sessions.undo(session, record)
    return await sessions.detail(session, record)


@router.post(
    "/{session_id}/redo",
    summary="重做编辑",
    description="需要登录；恢复后续画布快照，无可重做操作时返回冲突。",
)
async def redo_session(
    session_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> SessionDetailOut:
    record = await _load(session, user, session_id)
    record = await sessions.redo(session, record)
    return await sessions.detail(session, record)


@router.get(
    "/{session_id}/history",
    summary="读取编辑历史",
    description="需要登录；按序号倒序返回此会话的操作记录。",
)
async def get_history(
    session_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> list[HistoryOut]:
    record = await _load(session, user, session_id)
    entries = await sessions.history_of(session, record)
    return [HistoryOut.of(entry) for entry in entries]


@router.post(
    "/{session_id}/exports",
    summary="导出交付文件",
    description="需要登录；打包指定的会话产物，默认导出营销图和投放尺寸。",
)
async def export_session(
    session_id: uuid.UUID, payload: ExportIn, user: CurrentUser, session: SessionDep
) -> Response:
    record = await _load(session, user, session_id)
    packed = await exports.pack(session, record, payload.asset_ids)
    return Response(
        content=packed.data,
        media_type="application/zip",
        headers={"Content-Disposition": packed.disposition},
    )


@router.get(
    "/{session_id}/messages",
    summary="查询 AI 对话",
    description="需要登录；返回此会话的指令、计划和执行状态。",
)
async def list_messages(
    session_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> list[TurnOut]:
    record = await _load(session, user, session_id)
    return [TurnOut.of(turn) for turn in await agent_service.turns_of(session, record)]


@router.post(
    "/{session_id}/messages",
    status_code=status.HTTP_201_CREATED,
    summary="发送编辑指令",
    description="需要登录；先生成计划，按计划状态确认后执行。",
)
async def send_message(
    session_id: uuid.UUID, payload: MessageIn, user: CurrentUser, session: SessionDep
) -> TurnOut:
    record = await _load(session, user, session_id)
    return TurnOut.of(await agent_service.respond(session, record, payload.text))


@router.post(
    "/{session_id}/messages/{turn_id}/confirm",
    summary="确认执行计划",
    description="需要登录；只能确认等待执行的当前计划。",
)
async def confirm_plan(
    session_id: uuid.UUID, turn_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> TurnOut:
    record = await _load(session, user, session_id)
    return TurnOut.of(await agent_service.confirm(session, record, turn_id))


@router.post(
    "/{session_id}/messages/{turn_id}/cancel",
    summary="取消计划",
    description="需要登录；按当前计划状态取消后续操作。",
)
async def cancel_plan(
    session_id: uuid.UUID, turn_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> TurnOut:
    record = await _load(session, user, session_id)
    return TurnOut.of(await agent_service.cancel(session, record, turn_id))


@router.post(
    "/{session_id}/messages/{turn_id}/retry",
    summary="重试计划",
    description="需要登录；从允许重试的步骤继续执行。",
)
async def retry_plan(
    session_id: uuid.UUID, turn_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> TurnOut:
    record = await _load(session, user, session_id)
    return TurnOut.of(await agent_service.retry(session, record, turn_id))
