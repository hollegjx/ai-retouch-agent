import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.asset import AssetOut
from app.schemas.run import RunOut

BATCH_TOOLS = (
    "remove_background",
    "replace_background",
    "adjust_image",
    "upscale_image",
    "expand_canvas",
    "prepare_delivery_sizes",
)

MAX_BATCH_ASSETS = 20
ExportFormat = Literal["png", "jpg"]


class BatchOpIn(BaseModel):
    tool: Literal[
        "remove_background",
        "replace_background",
        "adjust_image",
        "upscale_image",
        "expand_canvas",
        "prepare_delivery_sizes",
    ] = Field(description="工具名称", examples=["remove_background"])
    params: dict = Field(description="对应工具的参数对象", default_factory=dict)


class BatchIn(BaseModel):
    asset_ids: list[uuid.UUID] = Field(
        description="当前用户拥有的素材标识列表", min_length=1, max_length=MAX_BATCH_ASSETS
    )
    operations: list[BatchOpIn] = Field(
        description="按顺序执行的批量处理步骤", min_length=1, max_length=len(BATCH_TOOLS)
    )
    formats: list[ExportFormat] = Field(
        description="输出格式，可选 png、jpg",
        default_factory=lambda: ["png"],
        min_length=1,
        max_length=2,
    )


class BatchItemOut(BaseModel):
    source: AssetOut = Field(description="素材来源")
    status: str = Field(description="执行状态")
    error: str | None = Field(default=None, description="失败原因，无错误时为 null")
    outputs: list[AssetOut] = Field(default=[], description="处理结果图片")


class BatchOut(BaseModel):
    run: RunOut = Field(description="编辑任务状态")
    items: list[BatchItemOut] = Field(default=[], description="逐项处理结果")
    created_at: datetime = Field(description="服务端生成的创建时间")
