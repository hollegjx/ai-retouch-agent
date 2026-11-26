import uuid
from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile, status

from app.db import SessionDep
from app.deps import CurrentUser
from app.schemas.asset import AssetOut, LibraryGroupOut
from app.services import assets as asset_service
from app.services.images import MAX_FILE_BYTES

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="上传图片",
    description="需要登录；接收 JPG、PNG 或 WebP，单张不超过 20 MB。",
)
async def upload(
    user: CurrentUser,
    session: SessionDep,
    file: Annotated[UploadFile, File()],
) -> AssetOut:
    data = await file.read(MAX_FILE_BYTES + 1)
    asset = await asset_service.upload(session, user.id, data)
    return AssetOut.of(asset)


@router.get("", summary="查询我的素材", description="需要登录；按创建时间倒序返回当前用户的素材。")
async def list_assets(
    user: CurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(description="最多返回的记录数", ge=1, le=200)] = 50,
) -> list[AssetOut]:
    records = await asset_service.list_for_user(session, user.id, limit)
    return [AssetOut.of(asset) for asset in records]


@router.get(
    "/library",
    summary="查询素材库",
    description="需要登录；素材按会话分组，未归入会话的素材单独展示。",
)
async def list_library(
    user: CurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(description="最多返回的记录数", ge=1, le=200)] = 50,
) -> list[LibraryGroupOut]:
    return await asset_service.library(session, user.id, limit)


@router.get(
    "/{asset_id}",
    summary="读取素材",
    description="需要登录；仅能读取自己的素材，图片 URL 为临时签名地址。",
)
async def get_asset(asset_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> AssetOut:
    asset = await asset_service.require_for_user(session, user.id, asset_id)
    return AssetOut.of(asset)
