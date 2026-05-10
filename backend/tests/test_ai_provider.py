"""Tests for the AI provider registry and /api/config/ai-provider endpoints."""

import pytest
from fastapi.testclient import TestClient

import app.ai.provider as provider_module
from app.ai.provider import get_active_provider, reset, set_active_provider
from app.config import get_settings
from app.main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def reset_provider_and_settings(monkeypatch):
    """Reset registry and settings cache before/after every test."""
    monkeypatch.setenv("JWT_SECRET", "test-ai-provider-secret-for-pytest")
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    monkeypatch.setenv("ENVIRONMENT", "test")
    get_settings.cache_clear()
    reset()
    yield
    get_settings.cache_clear()
    reset()


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def client_with_openai_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-openai")
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    get_settings.cache_clear()
    reset()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def client_with_both_keys(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-openai")
    monkeypatch.setenv("GOOGLE_API_KEY", "gk-test-google")
    get_settings.cache_clear()
    reset()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def client_no_keys(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    get_settings.cache_clear()
    reset()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Registry unit tests
# ---------------------------------------------------------------------------


def test_registry_initialises_from_settings_default(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    get_settings.cache_clear()
    reset()
    assert get_active_provider() == "openai"


def test_registry_initialises_from_settings_gemini(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    get_settings.cache_clear()
    reset()
    assert get_active_provider() == "gemini"


def test_registry_set_and_get():
    set_active_provider("gemini")
    assert get_active_provider() == "gemini"
    set_active_provider("openai")
    assert get_active_provider() == "openai"


def test_registry_reset_restores_settings_default(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    get_settings.cache_clear()
    set_active_provider("gemini")
    assert get_active_provider() == "gemini"
    reset()
    assert get_active_provider() == "openai"


# ---------------------------------------------------------------------------
# LLM factory unit tests
# ---------------------------------------------------------------------------


def test_get_llm_returns_chat_openai_when_registry_is_openai():
    from langchain_openai import ChatOpenAI

    from app.ai.llm import get_llm

    set_active_provider("openai")
    llm = get_llm()
    assert isinstance(llm, ChatOpenAI)


def test_get_llm_returns_google_genai_when_registry_is_gemini(monkeypatch):
    from langchain_google_genai import ChatGoogleGenerativeAI

    from app.ai.llm import get_llm

    monkeypatch.setenv("GOOGLE_API_KEY", "gk-test-key")
    get_settings.cache_clear()
    set_active_provider("gemini")
    llm = get_llm()
    assert isinstance(llm, ChatGoogleGenerativeAI)


def test_get_llm_uses_chat_model_openai_setting(monkeypatch):
    from langchain_openai import ChatOpenAI

    from app.ai.llm import get_llm

    monkeypatch.setenv("CHAT_MODEL_OPENAI", "gpt-4o")
    get_settings.cache_clear()
    set_active_provider("openai")
    llm = get_llm()
    assert isinstance(llm, ChatOpenAI)
    assert llm.model_name == "gpt-4o"


# ---------------------------------------------------------------------------
# API integration tests
# ---------------------------------------------------------------------------


def test_get_ai_provider_returns_current_state(client_with_openai_key):
    r = client_with_openai_key.get("/api/config/ai-provider")
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "openai"
    assert set(body["available_providers"]) == {"openai", "gemini"}
    assert body["openai_key_present"] is True
    assert body["gemini_key_present"] is False


def test_post_ai_provider_valid_switches_provider(client_with_both_keys):
    r = client_with_both_keys.post(
        "/api/config/ai-provider", json={"provider": "gemini"}
    )
    assert r.status_code == 200
    assert r.json()["provider"] == "gemini"
    assert get_active_provider() == "gemini"


def test_post_ai_provider_missing_key_returns_400(client_with_openai_key):
    r = client_with_openai_key.post(
        "/api/config/ai-provider", json={"provider": "gemini"}
    )
    assert r.status_code == 400
    assert "GOOGLE_API_KEY" in r.json()["detail"]


def test_post_ai_provider_missing_openai_key_returns_400(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("GOOGLE_API_KEY", "gk-test")
    get_settings.cache_clear()
    reset()
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    get_settings.cache_clear()
    reset()
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.post("/api/config/ai-provider", json={"provider": "openai"})
    assert r.status_code == 400
    assert "OPENAI_API_KEY" in r.json()["detail"]


def test_post_ai_provider_invalid_value_returns_422(client):
    r = client.post("/api/config/ai-provider", json={"provider": "anthropic"})
    assert r.status_code == 422


def test_get_ai_provider_no_keys_shows_both_absent(client_no_keys):
    r = client_no_keys.get("/api/config/ai-provider")
    assert r.status_code == 200
    body = r.json()
    assert body["openai_key_present"] is False
    assert body["gemini_key_present"] is False
