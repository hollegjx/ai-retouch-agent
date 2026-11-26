"""与传输层无关的业务错误。"""

from enum import IntEnum


class ErrorCode(IntEnum):
    PARAMS_ERROR = 40000
    NOT_LOGIN_ERROR = 40100
    NO_AUTH_ERROR = 40101
    NOT_FOUND_ERROR = 40400
    SYSTEM_ERROR = 50000
    OPERATION_ERROR = 50001


class BusinessError(Exception):
    status_code = 409
    code = ErrorCode.OPERATION_ERROR
    message = "当前操作无法完成"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.message)


class AuthenticationRequired(BusinessError):
    status_code = 401
    code = ErrorCode.NOT_LOGIN_ERROR
    message = "未登录或会话已过期"
