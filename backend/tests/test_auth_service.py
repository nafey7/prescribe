"""Unit tests for auth service (Phase D foundations)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest

from app.config import get_settings, validate_auth_settings
from app.schemas.auth import validate_password_strength
from app.schemas.enums import UserRole
from app.service import auth as auth_service
from app.service.auth import (
    AuthTokenError,
    RefreshReuseDetectedError,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    issue_token_pair,
    rotate_refresh_token,
    verify_password,
)


@pytest.fixture
def auth_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-for-unit-tests-only")
    monkeypatch.setenv("BCRYPT_ROUNDS", "4")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_validate_auth_settings_rejects_missing_secret(monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("JWT_SECRET", "")
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_auth_settings(get_settings())
    get_settings.cache_clear()


def test_validate_auth_settings_rejects_placeholder_secret(monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("JWT_SECRET", "change-me")
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_auth_settings(get_settings())
    get_settings.cache_clear()


def test_validate_auth_settings_ok_when_auth_not_required(monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    monkeypatch.setenv("JWT_SECRET", "")
    get_settings.cache_clear()
    validate_auth_settings(get_settings())
    get_settings.cache_clear()


def test_password_policy_rejects_short():
    with pytest.raises(ValueError, match="8"):
        validate_password_strength("short1a")


def test_password_policy_requires_letter_and_digit():
    with pytest.raises(ValueError, match="letter"):
        validate_password_strength("1234567890123")
    with pytest.raises(ValueError, match="digit"):
        validate_password_strength("abcdefghijkl")


def test_hash_password_and_verify_round_trip(auth_env):
    h = hash_password("CorrectHorse1Battery", rounds=get_settings().BCRYPT_ROUNDS)
    assert verify_password("CorrectHorse1Battery", h)
    assert not verify_password("WrongPassword1Here", h)


def test_create_access_token_decode_happy_path(auth_env):
    user = {
        "user_id": "usr_test_1",
        "role": UserRole.PATIENT,
        "token_version": 0,
    }
    token = create_access_token(user)
    claims = decode_access_token(token)
    assert claims["sub"] == "usr_test_1"
    assert claims["typ"] == "access"
    assert claims["iss"] == "prescribe-v2"


def test_decode_access_token_rejects_wrong_secret(auth_env, monkeypatch):
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    token = create_access_token(user)
    monkeypatch.setenv("JWT_SECRET", "different-secret")
    get_settings.cache_clear()
    try:
        with pytest.raises(AuthTokenError):
            decode_access_token(token)
    finally:
        get_settings.cache_clear()


def test_decode_access_token_rejects_expired(auth_env):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "u1",
        "role": "patient",
        "iat": now,
        "exp": now - timedelta(minutes=5),
        "iss": settings.JWT_ISSUER,
        "typ": "access",
        "tv": 0,
    }
    token = jwt.encode(
        payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )
    with pytest.raises(AuthTokenError):
        decode_access_token(token)


def test_decode_access_token_rejects_wrong_issuer(auth_env):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "u1",
        "role": "patient",
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "iss": "evil-issuer",
        "typ": "access",
        "tv": 0,
    }
    token = jwt.encode(
        payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )
    with pytest.raises(AuthTokenError):
        decode_access_token(token)


def test_decode_access_token_rejects_refresh_typ(auth_env):
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    refresh = create_refresh_token(user, family_id="fam-1")
    with pytest.raises(AuthTokenError, match="type"):
        decode_access_token(refresh)


def test_decode_access_token_tv_mismatch_with_user(auth_env):
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    token = create_access_token(user)
    user_bumped = {**user, "token_version": 1}
    with pytest.raises(AuthTokenError, match="version"):
        decode_access_token(token, user=user_bumped)


def test_create_refresh_token_new_jti_each_call(auth_env):
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    a = create_refresh_token(user, family_id="same-family")
    b = create_refresh_token(user, family_id="same-family")
    ca = decode_refresh_token(a)
    cb = decode_refresh_token(b)
    assert ca["jti"] != cb["jti"]
    assert ca["fid"] == cb["fid"] == "same-family"


def test_decode_refresh_token_rejects_access_typ(auth_env):
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    access = create_access_token(user)
    with pytest.raises(AuthTokenError, match="type"):
        decode_refresh_token(access)


def test_decode_refresh_token_tv_mismatch(auth_env):
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    token = create_refresh_token(user, family_id="fam")
    user_bumped = {**user, "token_version": 9}
    with pytest.raises(AuthTokenError, match="version"):
        decode_refresh_token(token, user=user_bumped)


@pytest.mark.asyncio
async def test_issue_token_pair_persists_refresh_row(auth_env):
    stored: dict = {}

    async def insert_token(db, doc):
        stored[doc["_id"]] = doc.copy()

    db = MagicMock()
    with patch.object(auth_service.refresh_tokens, "insert_token", insert_token):
        user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
        pair = await issue_token_pair(db, user)
    assert len(stored) == 1
    jti = next(iter(stored.keys()))
    assert stored[jti]["family_id"] == stored[jti]["family_id"]
    assert pair.access_token
    assert pair.refresh_token
    decode_access_token(pair.access_token)
    decode_refresh_token(pair.refresh_token)


@pytest.mark.asyncio
async def test_rotate_refresh_token_happy_path(auth_env):
    rows: dict = {}

    async def insert_token(db, doc):
        rows[doc["_id"]] = doc.copy()

    async def get_by_jti(db, jti):
        r = rows.get(jti)
        return r.copy() if r else None

    async def revoke_active_token(db, *, jti, user_id, replaced_by_jti):
        r = rows.get(jti)
        if not r or r.get("revoked_at") is not None:
            return None
        r["revoked_at"] = datetime.now(timezone.utc)
        r["replaced_by_jti"] = replaced_by_jti
        return r.copy()

    db = MagicMock()
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}

    with (
        patch.object(auth_service.refresh_tokens, "insert_token", insert_token),
        patch.object(auth_service.refresh_tokens, "get_by_jti", get_by_jti),
        patch.object(auth_service.refresh_tokens, "revoke_active_token", revoke_active_token),
        patch.object(auth_service.users, "get_user_by_id", AsyncMock(return_value=user)),
    ):
        pair1 = await issue_token_pair(db, user)
        pair2 = await rotate_refresh_token(db, pair1.refresh_token)

    assert len(rows) == 2
    old_jti = decode_refresh_token(pair1.refresh_token)["jti"]
    assert rows[old_jti]["revoked_at"] is not None
    decode_access_token(pair2.access_token)
    decode_refresh_token(pair2.refresh_token)


@pytest.mark.asyncio
async def test_rotate_refresh_token_replay_revokes_family(auth_env):
    rows: dict = {}

    async def insert_token(db, doc):
        rows[doc["_id"]] = doc.copy()

    async def get_by_jti(db, jti):
        r = rows.get(jti)
        return r.copy() if r else None

    async def revoke_active_token(db, *, jti, user_id, replaced_by_jti):
        r = rows.get(jti)
        if not r or r.get("revoked_at") is not None:
            return None
        r["revoked_at"] = datetime.now(timezone.utc)
        r["replaced_by_jti"] = replaced_by_jti
        return r.copy()

    db = MagicMock()
    user = {"user_id": "u1", "role": UserRole.PATIENT, "token_version": 0}
    bumps: list[str] = []

    async def bump_token_version(db, user_id: str):
        bumps.append(user_id)
        return {"user_id": user_id, "token_version": 1}

    with (
        patch.object(auth_service.refresh_tokens, "insert_token", insert_token),
        patch.object(auth_service.refresh_tokens, "get_by_jti", get_by_jti),
        patch.object(auth_service.refresh_tokens, "revoke_active_token", revoke_active_token),
        patch.object(auth_service.refresh_tokens, "revoke_family", AsyncMock()),
        patch.object(auth_service.users, "get_user_by_id", AsyncMock(return_value=user)),
        patch.object(auth_service.users, "bump_token_version", bump_token_version),
    ):
        pair1 = await issue_token_pair(db, user)
        await rotate_refresh_token(db, pair1.refresh_token)
        with pytest.raises(RefreshReuseDetectedError):
            await rotate_refresh_token(db, pair1.refresh_token)

    assert bumps == ["u1"]


@pytest.mark.asyncio
async def test_authenticate_user_dummy_verify_when_missing():
    db = MagicMock()
    with patch.object(
        auth_service.users,
        "get_user_by_email_with_password_hash",
        AsyncMock(return_value=None),
    ):
        out = await authenticate_user(db, "missing@example.com", "AnyPassword1Here")
    assert out is None


@pytest.mark.asyncio
async def test_authenticate_user_success():
    db = MagicMock()
    h = hash_password("GoodPassword1Here", rounds=4)
    user = {
        "user_id": "u1",
        "role": UserRole.PATIENT,
        "email": "a@b.com",
        "password_hash": h,
        "token_version": 0,
    }
    with patch.object(
        auth_service.users,
        "get_user_by_email_with_password_hash",
        AsyncMock(return_value=user),
    ):
        out = await authenticate_user(db, "a@b.com", "GoodPassword1Here")
    assert out is not None
    assert out["user_id"] == "u1"
