import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.layers import LayerDocument
from app.models import EditHistory, EditSession
from app.schemas.asset import AssetOut
from app.schemas.run import RunOut

MAX_WALL_ASSETS = 12


class SessionCreateIn(BaseModel):
    current_asset_id: uuid.UUID = Field(description="当前画布素材标识，必须属于当前用户")
    # 同批未采用的候选一并进图片墙
    asset_ids: Annotated[
        list[uuid.UUID], Field(description="当前用户拥有的素材标识列表", max_length=MAX_WALL_ASSETS)
    ] = []
    title: str | None = Field(default=None, description="会话标题", examples=["产品主图"])


class SessionPatchIn(BaseModel):
    title: str | None = Field(default=None, description="会话标题", examples=["产品主图"])
    current_asset_id: uuid.UUID | None = Field(
        default=None, description="当前画布素材标识，必须属于当前用户"
    )


class ToolInvokeIn(BaseModel):
    tool: str = Field(description="工具名称", examples=["remove_background"])
    params: dict = Field(default={}, description="对应工具的参数对象")


class PointIn(BaseModel):
    x: float = Field(description="横坐标，选区输入使用 0–1 的归一化坐标", ge=0, le=1)
    y: float = Field(description="纵坐标，选区输入使用 0–1 的归一化坐标", ge=0, le=1)


class SelectIn(BaseModel):
    revision: int = Field(description="画布修订号，使用会话接口返回的最新值", examples=[1])
    points: list[PointIn] = Field(default=[], description="点选坐标列表")
    strokes: list[list[PointIn]] = Field(default=[], description="每条画笔轨迹的坐标列表")
    radius: float = Field(
        description="画笔半径，相对于画布短边的比例", default=0.03, ge=0.005, le=0.12
    )
    append: bool = Field(default=False, description="是否在已有选区上追加")


class MarkerOut(BaseModel):
    index: int = Field(description="选区标记序号，从 1 开始")
    x: float = Field(description="横坐标，选区输入使用 0–1 的归一化坐标")
    y: float = Field(description="纵坐标，选区输入使用 0–1 的归一化坐标")


class SelectionOut(BaseModel):
    revision: int = Field(description="画布修订号，使用会话接口返回的最新值", examples=[1])
    mask: AssetOut = Field(description="选区遮罩图片")
    markers: list[MarkerOut] = Field(default=[], description="选区标记")


class SessionOut(BaseModel):
    id: uuid.UUID = Field(description="服务端生成的唯一标识")
    title: str = Field(description="会话标题", examples=["产品主图"])
    revision: int = Field(description="画布修订号，使用会话接口返回的最新值", examples=[1])
    history_seq: int = Field(description="当前历史记录序号")
    original_asset_id: uuid.UUID = Field(description="初始素材标识")
    current_asset_id: uuid.UUID = Field(description="当前画布素材标识，必须属于当前用户")
    created_at: datetime = Field(description="服务端生成的创建时间")
    updated_at: datetime = Field(description="服务端记录的最后更新时间")

    @classmethod
    def of(cls, record: EditSession) -> "SessionOut":
        return cls(
            id=record.id,
            title=record.title,
            revision=record.revision,
            history_seq=record.history_seq,
            original_asset_id=record.original_asset_id,
            current_asset_id=record.current_asset_id,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )


class SessionDetailOut(SessionOut):
    document: LayerDocument = Field(description="当前图层文档")
    previous_document: LayerDocument | None = Field(
        default=None, description="上一次操作前的图层文档"
    )
    assets: list[AssetOut] = Field(default=[], description="会话素材列表")
    can_undo: bool = Field(default=False, description="是否可以撤销")
    can_redo: bool = Field(default=False, description="是否可以重做")

    @classmethod
    def of_detail(
        cls,
        record: EditSession,
        assets: list[AssetOut],
        *,
        previous_document: LayerDocument | None = None,
        can_undo: bool = False,
        can_redo: bool = False,
    ) -> "SessionDetailOut":
        return cls(
            **SessionOut.of(record).model_dump(),
            document=LayerDocument.model_validate(record.document),
            previous_document=previous_document,
            assets=assets,
            can_undo=can_undo,
            can_redo=can_redo,
        )


class ToolInvokeOut(BaseModel):
    run: RunOut = Field(description="编辑任务状态")
    session: SessionDetailOut = Field(description="最新编辑会话")


class HistoryOut(BaseModel):
    seq: int = Field(description="历史操作序号")
    action: str = Field(description="操作名称")
    params: dict = Field(description="对应工具的参数对象")
    result: dict = Field(description="工具执行结果")
    created_at: datetime = Field(description="服务端生成的创建时间")

    @classmethod
    def of(cls, entry: EditHistory) -> "HistoryOut":
        return cls(
            seq=entry.seq,
            action=entry.action,
            params=entry.params,
            result=entry.result,
            created_at=entry.created_at,
        )
