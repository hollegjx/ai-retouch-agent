import uuid

import httpx
import pytest
from httpx import ASGITransport
from sqlalchemy import delete

from app import events
from app.config import get_settings
from app.db import SessionFactory
from app.main import app
from app.models import User
from app.providers import get_image_provider
from app.queue import close_queue
from app.storage import _client

# 仅用于可识别的测试账号名，清理只按本次创建的精确用户名。
TEST_USER_PREFIX = "test_"


@pytest.fixture(scope="session", autouse=True)
def bucket():
    _client().head_bucket(Bucket=get_settings().s3_bucket)


@pytest.fixture(scope="session", autouse=True)
def mock_provider():
    """测试一律走占位图实现，不受本机 IMAGE_PROVIDER 配置影响，也不产生调用费用。"""
    settings = get_settings()
    original, settings.image_provider = settings.image_provider, "mock"
    get_image_provider.cache_clear()
    yield
    settings.image_provider = original
    get_image_provider.cache_clear()


@pytest.fixture(scope="session", autouse=True)
def corner_matting():
    settings = get_settings()
    original, settings.matting_provider = settings.matting_provider, "corner"
    yield
    settings.matting_provider = original


@pytest.fixture(scope="session", autouse=True)
def skip_ocr():
    settings = get_settings()
    original, settings.ocr_provider = settings.ocr_provider, "none"
    yield
    settings.ocr_provider = original


@pytest.fixture(scope="session", autouse=True)
async def close_test_resources():
    yield
    await close_queue()
    await events.redis_client().aclose()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def _credentials() -> dict[str, str]:
    return {"username": f"{TEST_USER_PREFIX}{uuid.uuid4().hex[:10]}", "password": "secret123"}


@pytest.fixture
def credentials(created_usernames) -> dict[str, str]:
    value = _credentials()
    created_usernames.append(value["username"])
    return value


@pytest.fixture
def other_credentials(created_usernames) -> dict[str, str]:
    """第二个账号，用于验证跨用户访问被拒绝。"""
    value = _credentials()
    created_usernames.append(value["username"])
    return value


@pytest.fixture
def created_usernames():
    return []


@pytest.fixture(autouse=True)
async def cleanup_users(created_usernames):
    yield
    async with SessionFactory() as session:
        await session.execute(delete(User).where(User.username.in_(created_usernames)))
        await session.commit()
