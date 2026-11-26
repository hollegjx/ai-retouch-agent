import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BusinessError, ErrorCode
from app.models import User
from app.security import hash_password, verify_password


class UsernameTaken(BusinessError):
    status_code = 409
    code = ErrorCode.OPERATION_ERROR
    message = "该用户名已被占用"


class InvalidCredentials(BusinessError):
    status_code = 401
    code = ErrorCode.NOT_LOGIN_ERROR
    message = "用户名或密码错误"


async def register(session: AsyncSession, username: str, password: str) -> User:
    user = User(username=username, password_hash=await asyncio.to_thread(hash_password, password))
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise UsernameTaken from exc
    return user


async def authenticate(session: AsyncSession, username: str, password: str) -> User:
    user = await session.scalar(select(User).where(User.username == username))
    if user is None or not await asyncio.to_thread(verify_password, password, user.password_hash):
        raise InvalidCredentials
    return user


async def get_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)
