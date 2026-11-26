from fastapi import APIRouter, Response, status

from app.config import get_settings
from app.db import SessionDep
from app.deps import CurrentUser
from app.models import User
from app.schemas.auth import Credentials, UserOut
from app.security import SESSION_COOKIE, issue_token
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _start_session(response: Response, user: User) -> UserOut:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        issue_token(user.id),
        max_age=settings.jwt_ttl_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        path="/",
    )
    return UserOut.model_validate(user)


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="注册账号",
    description="用户名为 3–32 位字母、数字或下划线；成功后写入 HttpOnly Cookie。",
)
async def register(credentials: Credentials, response: Response, session: SessionDep) -> UserOut:
    user = await auth_service.register(session, credentials.username, credentials.password)
    return _start_session(response, user)


@router.post(
    "/login", summary="登录", description="校验账号密码，成功后写入 HttpOnly 登录 Cookie。"
)
async def login(credentials: Credentials, response: Response, session: SessionDep) -> UserOut:
    user = await auth_service.authenticate(session, credentials.username, credentials.password)
    return _start_session(response, user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="退出登录",
    description="清除登录 Cookie，重复调用无副作用。",
)
async def logout(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me", summary="读取当前用户", description="需要登录，仅返回当前用户的公开字段。")
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
