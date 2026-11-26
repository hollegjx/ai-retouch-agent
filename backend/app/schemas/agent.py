import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.models import AgentRun
from app.models.tool_run import RunStatus
from app.tools import label_of

MAX_MESSAGE = 1000


class MessageIn(BaseModel):
    text: Annotated[
        str,
        Field(
            description="自然语言编辑指令",
            examples=["去除背景并提升亮度"],
            min_length=1,
            max_length=MAX_MESSAGE,
        ),
    ]

    @field_validator("text")
    @classmethod
    def _require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("指令不能为空")
        return value


class PlanStepOut(BaseModel):
    id: str = Field(description="服务端生成的唯一标识")
    tool: str = Field(description="工具名称", examples=["remove_background"])
    label: str = Field(description="操作的显示名称")
    depends_on: list[str] = Field(default=[], description="前置步骤标识")
    run_id: uuid.UUID | None = Field(default=None, description="对应的工具任务标识")
    status: str = Field(default="pending", description="执行状态")

    @classmethod
    def of(cls, step: dict) -> "PlanStepOut":
        run_id = step.get("run_id")
        return cls(
            id=step.get("id") or step["tool"],
            tool=step["tool"],
            label=label_of(step["tool"], step.get("params")),
            depends_on=list(step.get("depends_on") or []),
            run_id=uuid.UUID(run_id) if run_id else None,
            status=step.get("status") or ("succeeded" if run_id else "pending"),
        )


class TurnOut(BaseModel):
    id: uuid.UUID = Field(description="服务端生成的唯一标识")
    revision: int = Field(description="画布修订号，使用会话接口返回的最新值", examples=[1])
    goal: str = Field(description="用户指令")
    reply: str = Field(description="AI 对计划的说明")
    status: RunStatus = Field(description="执行状态")
    error: str | None = Field(description="失败原因，无错误时为 null")
    created_at: datetime = Field(description="服务端生成的创建时间")
    steps: list[PlanStepOut] = Field(default=[], description="按依赖关系执行的计划步骤")

    @classmethod
    def of(cls, turn: AgentRun) -> "TurnOut":
        return cls(
            id=turn.id,
            revision=turn.revision,
            goal=turn.goal,
            reply=turn.reply,
            status=turn.status,
            error=turn.error,
            created_at=turn.created_at,
            steps=[PlanStepOut.of(step) for step in turn.plan],
        )
