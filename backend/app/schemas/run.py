import uuid
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.models.tool_run import RunStatus, ToolRun
from app.ratios import Ratio
from app.schemas.asset import AssetOut

MAX_PROMPT = 1500
MAX_REFERENCES = 3


class GenerateIn(BaseModel):
    prompt: Annotated[
        str,
        Field(
            description="画面描述，去除首尾空格后不得为空",
            examples=["白色陶瓷杯，浅木色桌面，自然光"],
            min_length=1,
            max_length=MAX_PROMPT,
        ),
    ]
    ratio: Ratio = Field(default=Ratio.SQUARE, description="输出画面比例", examples=["1:1"])
    count: Annotated[int, Field(description="候选图片数量", examples=[4], ge=1, le=6)] = 4
    negative_prompt: Annotated[
        str | None, Field(description="排除的画面内容", max_length=MAX_PROMPT)
    ] = None
    seed: Annotated[
        int | None, Field(description="随机种子，固定种子便于复现", ge=0, le=2147483647)
    ] = None
    reference_asset_ids: Annotated[
        list[uuid.UUID],
        Field(description="最多三张当前用户拥有的参考图", max_length=MAX_REFERENCES),
    ] = []

    @field_validator("prompt")
    @classmethod
    def _require_prompt(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("提示词不能为空")
        return value

    @field_validator("negative_prompt")
    @classmethod
    def _blank_to_none(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


class RunOut(BaseModel):
    id: uuid.UUID = Field(description="服务端生成的唯一标识")
    tool: str = Field(description="工具名称", examples=["remove_background"])
    status: RunStatus = Field(description="执行状态")
    progress: int = Field(description="任务进度，0–100", examples=[50])
    stage: str = Field(description="当前执行阶段")
    error: str | None = Field(description="失败原因，无错误时为 null")
    prompt: str | None = Field(
        default=None,
        description="画面描述，去除首尾空格后不得为空",
        examples=["白色陶瓷杯，浅木色桌面，自然光"],
    )
    candidates: list[AssetOut] = Field(default=[], description="生成的候选图片")
    result: dict = Field(default={}, description="工具执行结果")

    @classmethod
    def of(cls, run: ToolRun, candidates: list[AssetOut] | None = None) -> "RunOut":
        return cls(
            id=run.id,
            tool=run.tool,
            status=run.status,
            progress=run.progress,
            stage=run.stage,
            error=run.error,
            prompt=run.params.get("prompt"),
            candidates=candidates or [],
            result=run.result or {},
        )
