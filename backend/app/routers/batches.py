import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from fastapi.responses import Response

from app.db import SessionDep
from app.deps import CurrentUser
from app.schemas.batch import BatchIn, BatchOut
from app.schemas.run import RunOut
from app.services import batch

router = APIRouter(prefix="/batches", tags=["batches"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    summary="创建批量任务",
    description="需要登录；对自己的素材按顺序执行选定处理步骤。",
)
async def create_batch(payload: BatchIn, user: CurrentUser, session: SessionDep) -> RunOut:
    run = await batch.submit(session, user.id, payload)
    return RunOut.of(run)


@router.get(
    "", summary="查询批量任务", description="需要登录；按创建时间倒序返回当前用户的批量任务。"
)
async def list_batches(
    user: CurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(description="最多返回的记录数", ge=1, le=50)] = 20,
) -> list[BatchOut]:
    records = await batch.list_for_user(session, user.id, limit)
    return [await batch.detail(session, record) for record in records]


@router.get(
    "/{run_id}", summary="读取批量结果", description="需要登录；返回各图片的处理状态及产物。"
)
async def get_batch(run_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> BatchOut:
    run = await batch.get_for_user(session, user.id, run_id)
    return await batch.detail(session, run)


@router.get(
    "/{run_id}/export",
    summary="下载批量结果",
    description="需要登录；已成功的任务才可导出，返回 ZIP 文件。",
)
async def export_batch(run_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Response:
    run = await batch.get_for_user(session, user.id, run_id)
    packed = await batch.pack(session, run)
    return Response(
        content=packed.data,
        media_type="application/zip",
        headers={"Content-Disposition": packed.disposition},
    )
