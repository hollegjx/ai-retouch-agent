"""统一 HTTP 错误序列化，保持既有 detail 字段兼容。"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.exceptions import BusinessError, ErrorCode

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    detail: str = Field(description="可向用户展示的错误说明", examples=["素材不存在"])
    code: int = Field(description="业务错误码", examples=[40400])


ERROR_RESPONSES = {
    status: {"model": ErrorResponse, "description": description}
    for status, description in {
        401: "未登录或登录已过期",
        404: "资源不存在或不属于当前用户",
        409: "当前状态不允许此操作",
        413: "上传文件过大",
        422: "请求参数不符合要求",
        500: "服务暂时无法完成请求",
    }.items()
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BusinessError)
    async def business_error(_: Request, exc: BusinessError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc), "code": exc.code},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        messages = [error["msg"].removeprefix("Value error, ") for error in exc.errors()]
        return JSONResponse(
            status_code=422,
            content={"detail": "；".join(dict.fromkeys(messages)), "code": ErrorCode.PARAMS_ERROR},
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.error("请求执行失败 %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "服务暂时不可用，请稍后重试", "code": ErrorCode.SYSTEM_ERROR},
        )
