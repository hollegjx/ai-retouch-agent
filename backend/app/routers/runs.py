import uuid

from fastapi import APIRouter, status

from app.db import SessionDep
from app.deps import CurrentUser
from app.schemas.run import GenerateIn, RunOut
from app.services import generation, runs

router = APIRouter(tags=["runs"])


@router.post(
    "/generations",
    status_code=status.HTTP_202_ACCEPTED,
    summary="创建图片生成任务",
    description="需要登录；参考图必须属于当前用户。异步执行，通过任务详情或 SSE 查看结果。",
)
async def create_generation(payload: GenerateIn, user: CurrentUser, session: SessionDep) -> RunOut:
    run = await generation.submit(session, user.id, payload)
    return RunOut.of(run)


@router.get(
    "/runs/{run_id}",
    summary="读取任务状态",
    description="需要登录；仅能读取自己的任务，返回进度和候选图。",
)
async def get_run(run_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> RunOut:
    run = await runs.get(session, run_id, user.id)
    return RunOut.of(run, await runs.candidates(session, run))
