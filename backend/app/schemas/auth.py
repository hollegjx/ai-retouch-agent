import uuid

from pydantic import BaseModel, Field, field_validator


class Credentials(BaseModel):
    username: str = Field(
        min_length=3, max_length=32, description="3–32 位字母、数字或下划线", examples=["artist01"]
    )
    password: str = Field(
        min_length=6,
        max_length=64,
        description="6–64 位密码，UTF-8 编码不超过 72 字节",
        examples=["example-password"],
    )

    @field_validator("password")
    @classmethod
    def _password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("密码 UTF-8 编码不能超过 72 字节，请缩短密码")
        return value

    @field_validator("username", mode="before")
    @classmethod
    def _strip_username(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("username")
    @classmethod
    def _normalize(cls, value: str) -> str:
        if not value.replace("_", "").isalnum():
            raise ValueError("用户名只能包含字母、数字和下划线")
        return value


class UserOut(BaseModel):
    id: uuid.UUID = Field(description="服务端生成的用户标识")
    username: str = Field(description="用户名", examples=["artist01"])

    model_config = {"from_attributes": True}
