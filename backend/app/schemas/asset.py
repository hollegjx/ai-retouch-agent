import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app import storage
from app.models import Asset
from app.models.asset import AssetKind, AssetSource


class AssetOut(BaseModel):
    id: uuid.UUID = Field(description="服务端生成的唯一标识")
    kind: AssetKind = Field(description="素材类型")
    source: AssetSource = Field(description="素材来源")
    image_format: str = Field(description="图片编码格式")
    width: int = Field(description="宽度，像素", examples=[1080])
    height: int = Field(description="高度，像素", examples=[1080])
    size_bytes: int = Field(description="文件大小，字节", examples=[102400])
    has_alpha: bool = Field(description="是否包含透明通道", examples=[False])
    created_at: datetime = Field(description="服务端生成的创建时间")
    url: str = Field(description="临时签名图片地址")

    @classmethod
    def of(cls, asset: Asset) -> "AssetOut":
        return cls(
            id=asset.id,
            kind=asset.kind,
            source=asset.source,
            image_format=asset.image_format,
            width=asset.width,
            height=asset.height,
            size_bytes=asset.size_bytes,
            has_alpha=asset.has_alpha,
            created_at=asset.created_at,
            url=storage.signed_url(asset.storage_key),
        )


class LibraryGroupOut(BaseModel):
    session_id: uuid.UUID | None = Field(description="编辑会话标识")
    title: str = Field(description="会话标题", examples=["产品主图"])
    updated_at: datetime = Field(description="服务端记录的最后更新时间")
    cover: AssetOut = Field(description="分组封面")
    assets: list[AssetOut] = Field(description="会话素材列表")
