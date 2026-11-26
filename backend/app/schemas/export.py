import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.asset import AssetKind


class ExportIn(BaseModel):
    asset_ids: list[uuid.UUID] = Field(default=[], description="当前用户拥有的素材标识列表")


class ExportItemOut(BaseModel):
    file: str = Field(description="压缩包内文件路径")
    kind: str = Field(description="素材类型")
    ratio: str | None = Field(default=None, description="输出画面比例", examples=["1:1"])
    width: int = Field(description="宽度，像素", examples=[1080])
    height: int = Field(description="高度，像素", examples=[1080])
    asset_id: uuid.UUID | None = Field(default=None, description="素材标识")


class ExportManifestOut(BaseModel):
    title: str = Field(description="会话标题", examples=["产品主图"])
    session_id: uuid.UUID = Field(description="编辑会话标识")
    created_at: datetime = Field(description="服务端生成的创建时间")
    items: list[ExportItemOut] = Field(description="逐项处理结果")


class ExportOut(BaseModel):
    url: str = Field(description="临时签名图片地址")
    filename: str = Field(description="下载文件名")
    manifest: ExportManifestOut = Field(description="交付清单")


# 默认打包营销图与投放尺寸；未指定时也只收这两类
EXPORT_KINDS = (AssetKind.MARKETING, AssetKind.EXPORT)
