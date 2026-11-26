from typing import Annotated

from fastapi import Cookie, Depends

from app.db import SessionDep
from app.exceptions import AuthenticationRequired
from app.models import User
from app.security import SESSION_COOKIE, read_token
from app.services import auth as auth_service


async def current_user(
    session: SessionDep,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    if token is None:
        raise AuthenticationRequired

    user_id = read_token(token)
    if user_id is None:
        raise AuthenticationRequired

    user = await auth_service.get_by_id(session, user_id)
    if user is None:
        raise AuthenticationRequired
    return user


CurrentUser = Annotated[User, Depends(current_user)]
