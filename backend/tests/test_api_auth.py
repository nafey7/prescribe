"""API tests for /api/auth (Phase D — HTTP auth surface)."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture
def auth_api_env(monkeypatch):
    monkeypatch.setenv("BCRYPT_ROUNDS", "4")
    monkeypatch.setenv("JWT_SECRET", "test-api-auth-secret-key-for-pytest-only")
    monkeypatch.setenv("ENVIRONMENT", "test")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client(auth_api_env):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _unique_email() -> str:
    return f"auth_test_{uuid.uuid4().hex}@example.com"


def _strong_password() -> str:
    return "CorrectHorseBattery99"


def _signup_body(
    email: str,
    password: str,
    *,
    first_name: str = "Test",
    last_name: str = "User",
    **extra: object,
) -> dict:
    body: dict = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": password,
        "confirm_password": password,
    }
    body.update(extra)
    return body


def test_get_me_without_token_returns_401(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_get_me_with_bad_bearer_returns_401(client):
    r = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"}
    )
    assert r.status_code == 401


def test_signup_login_me_refresh_logout_happy_path(client):
    email = _unique_email()
    pw = _strong_password()

    su = client.post(
        "/api/auth/signup",
        json=_signup_body(email, pw),
    )
    assert su.status_code == 201, su.text
    signup_body = su.json()
    assert "access_token" in signup_body
    assert "refresh_token" in signup_body
    assert signup_body["user"]["email"] == email
    assert signup_body["token_type"] == "bearer"

    access1 = signup_body["access_token"]
    refresh1 = signup_body["refresh_token"]

    me = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {access1}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert me.json()["user_id"] == signup_body["user"]["user_id"]

    ref = client.post(
        "/api/auth/refresh", json={"refresh_token": refresh1}
    )
    assert ref.status_code == 200, ref.text
    pair = ref.json()
    access2 = pair["access_token"]
    refresh2 = pair["refresh_token"]
    assert refresh2 != refresh1
    me_after_refresh = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {access2}"}
    )
    assert me_after_refresh.status_code == 200

    replay = client.post(
        "/api/auth/refresh", json={"refresh_token": refresh1}
    )
    assert replay.status_code == 401
    assert replay.json()["detail"] == "Invalid refresh token"

    bad_access = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {access1}"}
    )
    assert bad_access.status_code == 401

    lo = client.post("/api/auth/logout", json={"refresh_token": refresh2})
    assert lo.status_code == 204

    after_logout = client.post(
        "/api/auth/refresh", json={"refresh_token": refresh2}
    )
    assert after_logout.status_code == 401


def test_signup_duplicate_email_409(client):
    email = _unique_email()
    pw = _strong_password()
    first = client.post(
        "/api/auth/signup", json=_signup_body(email, pw)
    )
    assert first.status_code == 201
    second = client.post(
        "/api/auth/signup", json=_signup_body(email, pw)
    )
    assert second.status_code == 409


def test_login_wrong_password_401(client):
    email = _unique_email()
    pw = _strong_password()
    client.post("/api/auth/signup", json=_signup_body(email, pw))

    bad = client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword99Here"},
    )
    assert bad.status_code == 401
    assert bad.json()["detail"] == "Invalid email or password"


def test_doctor_signup_disabled_422(client):
    r = client.post(
        "/api/auth/signup",
        json=_signup_body(
            _unique_email(),
            _strong_password(),
            role="doctor",
        ),
    )
    assert r.status_code == 422


def test_logout_malformed_refresh_still_204(client):
    r = client.post(
        "/api/auth/logout", json={"refresh_token": "not-a-jwt"}
    )
    assert r.status_code == 204


def test_logout_empty_body_204(client):
    r = client.post("/api/auth/logout", json={})
    assert r.status_code == 204


def test_signup_weak_password_422(client):
    r = client.post(
        "/api/auth/signup",
        json=_signup_body(_unique_email(), "short1", confirm_password="short1"),
    )
    assert r.status_code == 422


def test_signup_passwords_mismatch_422(client):
    r = client.post(
        "/api/auth/signup",
        json={
            "first_name": "A",
            "last_name": "B",
            "email": _unique_email(),
            "password": _strong_password(),
            "confirm_password": "DifferentHorseBattery99",
        },
    )
    assert r.status_code == 422


def test_refresh_reuse_revokes_access_tokens(client):
    """After reuse detection, access tokens for that user must be rejected."""
    email = _unique_email()
    pw = _strong_password()
    su = client.post(
        "/api/auth/signup", json=_signup_body(email, pw)
    )
    assert su.status_code == 201
    refresh_a = su.json()["refresh_token"]
    access_a = su.json()["access_token"]

    ref1 = client.post(
        "/api/auth/refresh", json={"refresh_token": refresh_a}
    )
    assert ref1.status_code == 200
    refresh_b = ref1.json()["refresh_token"]

    reuse = client.post(
        "/api/auth/refresh", json={"refresh_token": refresh_a}
    )
    assert reuse.status_code == 401

    still_bad = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {access_a}"}
    )
    assert still_bad.status_code == 401

    ok = client.post("/api/auth/refresh", json={"refresh_token": refresh_b})
    assert ok.status_code == 401
