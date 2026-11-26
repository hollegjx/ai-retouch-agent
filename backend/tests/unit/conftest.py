"""单测禁止外部网络；图片处理固定使用本地实现。"""

import socket

import pytest

from app.config import get_settings


@pytest.fixture(autouse=True)
def local_only(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("单元测试禁止访问网络或真实服务")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    settings = get_settings()
    monkeypatch.setattr(settings, "image_provider", "mock")
    monkeypatch.setattr(settings, "matting_provider", "corner")
    monkeypatch.setattr(settings, "ocr_provider", "none")
