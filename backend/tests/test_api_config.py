"""API tests for `/api/config/features` (feature flag surface)."""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture
def config_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-config-secret-key-for-pytest-only")
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    monkeypatch.setenv("ENVIRONMENT", "test")
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


@pytest.fixture
def client(config_env):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _get_flags(client: TestClient) -> dict:
    r = client.get("/api/config/features")
    assert r.status_code == 200, r.text
    return r.json()


def test_features_returns_expected_keys(client):
    body = _get_flags(client)
    assert set(body.keys()) == {
        "ai_suggestions_enabled",
        "auth_relaxed",
        "allow_doctor_self_signup",
    }
    assert isinstance(body["ai_suggestions_enabled"], bool)
    assert isinstance(body["auth_relaxed"], bool)
    assert isinstance(body["allow_doctor_self_signup"], bool)


def test_allow_doctor_self_signup_defaults_false(client):
    body = _get_flags(client)
    assert body["allow_doctor_self_signup"] is False


def test_allow_doctor_self_signup_reflects_env_true(config_env):
    config_env.setenv("ALLOW_DOCTOR_SELF_SIGNUP", "true")
    get_settings.cache_clear()
    with TestClient(app, raise_server_exceptions=False) as c:
        body = _get_flags(c)
    assert body["allow_doctor_self_signup"] is True


def test_allow_doctor_self_signup_reflects_env_false(config_env):
    config_env.setenv("ALLOW_DOCTOR_SELF_SIGNUP", "false")
    get_settings.cache_clear()
    with TestClient(app, raise_server_exceptions=False) as c:
        body = _get_flags(c)
    assert body["allow_doctor_self_signup"] is False


def test_auth_relaxed_true_in_local_when_auth_off(config_env):
    config_env.setenv("AUTH_REQUIRED", "false")
    config_env.setenv("ENVIRONMENT", "local")
    get_settings.cache_clear()
    with TestClient(app, raise_server_exceptions=False) as c:
        body = _get_flags(c)
    assert body["auth_relaxed"] is True


def test_auth_relaxed_false_when_auth_required(config_env):
    config_env.setenv("AUTH_REQUIRED", "true")
    config_env.setenv("ENVIRONMENT", "local")
    get_settings.cache_clear()
    with TestClient(app, raise_server_exceptions=False) as c:
        body = _get_flags(c)
    assert body["auth_relaxed"] is False
