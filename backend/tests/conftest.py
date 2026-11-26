"""默认只收集单元测试。集成测试须显式指定独立的数据库、桶和 Redis。"""

import os
from urllib.parse import urlsplit

import pytest


def pytest_addoption(parser):
    parser.addoption("--integration", action="store_true", help="运行独立环境的集成测试")


def pytest_ignore_collect(collection_path, config):
    return "integration" in collection_path.parts and not config.getoption("--integration")


def pytest_configure(config):
    if not config.getoption("--integration"):
        return
    names = ("DATABASE_URL", "REDIS_URL", "S3_ENDPOINT", "S3_BUCKET")
    values = {name: os.environ.get(f"TEST_{name}", "") for name in names}
    if not all(values.values()):
        raise pytest.UsageError(
            "集成测试需要 TEST_DATABASE_URL、TEST_REDIS_URL、TEST_S3_ENDPOINT、TEST_S3_BUCKET"
        )
    if not urlsplit(values["DATABASE_URL"]).path.endswith("_test"):
        raise pytest.UsageError("测试数据库名必须以 _test 结尾，不能使用开发数据库")
    if not values["S3_BUCKET"].endswith("-test"):
        raise pytest.UsageError("测试桶名称必须以 -test 结尾")
    redis_db = urlsplit(values["REDIS_URL"]).path.strip("/")
    if not redis_db.isdigit() or int(redis_db) == 0:
        raise pytest.UsageError("测试 Redis 必须显式使用独立的非 0 库")
    from app.config import Settings

    current = Settings()
    for name in ("DATABASE_URL", "REDIS_URL", "S3_BUCKET"):
        if getattr(current, name.lower()) == values[name]:
            raise pytest.UsageError(f"TEST_{name} 不能与当前 {name} 相同")
    os.environ.update(
        values,
        APP_ENV="test",
        IMAGE_PROVIDER="mock",
        MATTING_PROVIDER="corner",
        OCR_PROVIDER="none",
    )
