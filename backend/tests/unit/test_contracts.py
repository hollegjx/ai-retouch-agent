import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError

from app.error_handlers import register_exception_handlers
from app.exceptions import AuthenticationRequired
from app.schemas.auth import Credentials
from app.schemas.session import SessionPatchIn
from app.services import selections, sessions
from app.services.assets import AssetNotFound


@pytest.mark.parametrize("name", ["  a  ", "   ab", "   ", "x!x", "x" * 33])
def test_username_rules_apply_after_trimming(name):
    with pytest.raises(ValidationError):
        Credentials(username=name, password="secret123")


def test_username_is_normalized_without_changing_password():
    result = Credentials(username="  artist_01  ", password="  secret123  ")
    assert result.username == "artist_01"
    assert result.password == "  secret123  "


def test_multibyte_password_respects_bcrypt_limit():
    Credentials(username="artist", password="字" * 24)
    with pytest.raises(ValidationError, match="72"):
        Credentials(username="artist", password="字" * 25)


async def test_rejected_asset_does_not_rename_or_commit(monkeypatch):
    record = SimpleNamespace(title="原始标题")
    database = AsyncMock()
    monkeypatch.setattr(sessions, "get_for_user", AsyncMock(return_value=record))
    monkeypatch.setattr(
        sessions.asset_service, "require_for_user", AsyncMock(side_effect=AssetNotFound)
    )
    with pytest.raises(AssetNotFound):
        await sessions.update_for_user(
            database,
            uuid.uuid4(),
            uuid.uuid4(),
            SessionPatchIn(title="新标题", current_asset_id=uuid.uuid4()),
        )
    assert record.title == "原始标题"
    database.commit.assert_not_awaited()


async def test_title_and_image_update_commit_once(monkeypatch):
    record = SimpleNamespace(title="原始标题")
    asset = SimpleNamespace(id=uuid.uuid4())
    database = AsyncMock()
    monkeypatch.setattr(sessions, "get_for_user", AsyncMock(return_value=record))
    monkeypatch.setattr(sessions.asset_service, "require_for_user", AsyncMock(return_value=asset))
    switch = AsyncMock()
    monkeypatch.setattr(sessions, "switch_current", switch)
    result = await sessions.update_for_user(
        database,
        uuid.uuid4(),
        uuid.uuid4(),
        SessionPatchIn(title=" 新   标题 ", current_asset_id=asset.id),
    )
    assert result.title == "新 标题"
    switch.assert_awaited_once_with(database, record, asset, commit=False)
    database.commit.assert_awaited_once()
    database.refresh.assert_awaited_once_with(record)


async def test_empty_selection_is_a_business_error():
    from app.schemas.session import SelectIn

    with pytest.raises(selections.EmptySelection, match="点选"):
        await selections.select(AsyncMock(), SimpleNamespace(), SelectIn(revision=1))


async def test_app_error_contract_does_not_expose_password_or_exception():
    app = FastAPI()
    register_exception_handlers(app)

    @app.post("/validate")
    async def validate(payload: Credentials):
        return {"username": payload.username}

    @app.get("/private")
    async def private():
        raise AuthenticationRequired

    @app.get("/broken")
    async def broken():
        raise RuntimeError("internal credential detail")

    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://unit") as client:
        invalid = await client.post("/validate", json={"username": "ab", "password": "sensitive"})
        assert invalid.status_code == 422
        assert invalid.json()["code"] == 40000
        assert "sensitive" not in invalid.text
        auth = await client.get("/private")
        assert auth.status_code == 401
        assert auth.json()["code"] == 40100
        failed = await client.get("/broken")
        assert failed.status_code == 500
        assert failed.json()["code"] == 50000
        assert "credential" not in failed.text


def test_openapi_covers_all_routes_and_credentials():
    from app.main import app

    schema = app.openapi()
    operations = [operation for path in schema["paths"].values() for operation in path.values()]
    assert len(operations) == 34
    assert all(
        operation.get("summary") and operation.get("description") for operation in operations
    )
    assert all("422" in operation["responses"] for operation in operations)
    assert schema["components"]["schemas"]["Credentials"]["properties"]["password"]["description"]


async def test_frontend_reload_fallback_keeps_api_and_asset_404(tmp_path):
    from app.static import FrontendFiles

    (tmp_path / "index.html").write_text("<main>workspace</main>")
    app = FastAPI()
    app.mount("/", FrontendFiles(directory=tmp_path, html=True))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://unit"
    ) as client:
        page = await client.get("/editor/123")
        assert page.status_code == 200
        assert "workspace" in page.text
        for path in ("/api/missing", "/events/missing", "/assets/missing.js"):
            assert (await client.get(path)).status_code == 404


async def test_point_markers_are_contiguous_on_multi_point_selection(monkeypatch):
    record = SimpleNamespace(id=uuid.uuid4(), revision=1)
    monkeypatch.setattr(selections, "flatten_session", AsyncMock(return_value=b"source"))
    monkeypatch.setattr(selections, "segment_points", lambda *_: b"mask")
    store = AsyncMock(return_value={})
    monkeypatch.setattr(selections, "_store", store)
    await selections.select_points(
        AsyncMock(), record, 1, [(0.1, 0.2), (0.2, 0.3), (0.4, 0.5)], append=False
    )
    assert [marker["index"] for marker in store.call_args.args[-1]] == [1, 2, 3]
