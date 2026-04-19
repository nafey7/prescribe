from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.hash import bcrypt as bcrypt_hasher

from app.config import get_settings
from app.repository import refresh_tokens, users
from app.schemas.auth import TokenPair
from app.schemas.enums import UserRole

logger = logging.getLogger(__name__)


class AuthTokenError(Exception):
    """Invalid, expired, or malformed token."""


class RefreshReuseDetectedError(AuthTokenError):
    """Refresh token replay; session family was revoked."""


_TIMING_DUMMY_HASH: str | None = None


def _timing_safe_dummy_hash() -> str:
    global _TIMING_DUMMY_HASH
    if _TIMING_DUMMY_HASH is None:
        _TIMING_DUMMY_HASH = bcrypt_hasher.using(rounds=4).hash(
            "dummy-login-timing-pad"
        )
    return _TIMING_DUMMY_HASH


def hash_password(password: str, *, rounds: int) -> str:
    return bcrypt_hasher.using(rounds=rounds).hash(password)


def verify_password(plain: str, password_hash: str) -> bool:
    return bcrypt_hasher.verify(plain, password_hash)


def _role_to_str(role: Any) -> str:
    if isinstance(role, UserRole):
        return role.value
    return str(role)


def _encode_access_token(user: dict) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user["user_id"],
        "role": _role_to_str(user["role"]),
        "iat": now,
        "exp": exp,
        "iss": settings.JWT_ISSUER,
        "typ": "access",
        "tv": int(user.get("token_version", 0)),
    }
    return jwt.encode(
        payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def _encode_refresh_token(
    user: dict,
    *,
    jti: str,
    family_id: str,
    expires_at: datetime,
) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["user_id"],
        "role": _role_to_str(user["role"]),
        "iat": now,
        "exp": expires_at,
        "iss": settings.JWT_ISSUER,
        "typ": "refresh",
        "tv": int(user.get("token_version", 0)),
        "jti": jti,
        "fid": family_id,
    }
    return jwt.encode(
        payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def create_access_token(user: dict) -> str:
    return _encode_access_token(user)


def create_refresh_token(user: dict, *, family_id: str, jti: str | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jid = jti if jti is not None else str(uuid.uuid4())
    return _encode_refresh_token(
        user, jti=jid, family_id=family_id, expires_at=expires_at
    )


def decode_access_token(token: str, *, user: dict | None = None) -> dict[str, Any]:
    settings = get_settings()
    try:
        claims = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            leeway=settings.JWT_LEEWAY_SECONDS,
        )
    except jwt.PyJWTError as e:
        raise AuthTokenError("invalid or expired token") from e
    if claims.get("typ") != "access":
        raise AuthTokenError("invalid token type")
    if user is not None and int(claims.get("tv", -1)) != int(
        user.get("token_version", 0)
    ):
        raise AuthTokenError("token version mismatch")
    return claims


def decode_refresh_token(token: str, *, user: dict | None = None) -> dict[str, Any]:
    settings = get_settings()
    try:
        claims = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            leeway=settings.JWT_LEEWAY_SECONDS,
        )
    except jwt.PyJWTError as e:
        raise AuthTokenError("invalid or expired token") from e
    if claims.get("typ") != "refresh":
        raise AuthTokenError("invalid token type")
    if user is not None and int(claims.get("tv", -1)) != int(
        user.get("token_version", 0)
    ):
        raise AuthTokenError("token version mismatch")
    return claims


async def _persist_and_issue_tokens(
    db: AsyncIOMotorDatabase,
    user: dict,
    *,
    jti: str,
    family_id: str,
    user_agent: str | None,
    ip: str | None,
) -> TokenPair:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    doc = {
        "_id": jti,
        "user_id": user["user_id"],
        "family_id": family_id,
        "issued_at": now,
        "expires_at": expires_at,
        "revoked_at": None,
        "replaced_by_jti": None,
        "user_agent": user_agent,
        "ip": ip,
    }
    await refresh_tokens.insert_token(db, doc)
    access_token = _encode_access_token(user)
    refresh_token = _encode_refresh_token(
        user, jti=jti, family_id=family_id, expires_at=expires_at
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_expires_in=max(0, int((expires_at - now).total_seconds())),
    )


async def issue_token_pair(
    db: AsyncIOMotorDatabase,
    user: dict,
    *,
    family_id: str | None = None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> TokenPair:
    fid = family_id if family_id is not None else str(uuid.uuid4())
    jti = str(uuid.uuid4())
    return await _persist_and_issue_tokens(
        db,
        user,
        jti=jti,
        family_id=fid,
        user_agent=user_agent,
        ip=ip,
    )


async def _on_refresh_reuse(
    db: AsyncIOMotorDatabase, user_id: str, family_id: str, jti: str
) -> None:
    await refresh_tokens.revoke_family(db, user_id, family_id)
    await users.bump_token_version(db, user_id)
    logger.warning(
        "auth.refresh_reuse_detected user_id=%s family_id=%s jti=%s",
        user_id,
        family_id,
        jti,
    )


async def rotate_refresh_token(
    db: AsyncIOMotorDatabase,
    refresh_token: str,
    *,
    user_agent: str | None = None,
    ip: str | None = None,
) -> TokenPair:
    claims = decode_refresh_token(refresh_token)
    user_id = claims["sub"]
    jti = claims["jti"]
    fid = claims["fid"]

    user = await users.get_user_by_id(db, user_id)
    if user is None:
        raise AuthTokenError("invalid refresh token")
    if int(claims.get("tv", -1)) != int(user.get("token_version", 0)):
        raise AuthTokenError("invalid refresh token")

    row = await refresh_tokens.get_by_jti(db, jti)
    if row is None:
        raise AuthTokenError("invalid refresh token")

    if row.get("revoked_at") is not None:
        await _on_refresh_reuse(db, user_id, fid, jti)
        raise RefreshReuseDetectedError("invalid refresh token")

    if row.get("user_id") != user_id or row.get("family_id") != fid:
        raise AuthTokenError("invalid refresh token")

    new_jti = str(uuid.uuid4())
    updated = await refresh_tokens.revoke_active_token(
        db, jti=jti, user_id=user_id, replaced_by_jti=new_jti
    )
    if updated is None:
        # Another request may have won the atomic revoke; do not treat as reuse.
        raise AuthTokenError("invalid refresh token")

    return await _persist_and_issue_tokens(
        db,
        user,
        jti=new_jti,
        family_id=fid,
        user_agent=user_agent,
        ip=ip,
    )


async def revoke_family(db: AsyncIOMotorDatabase, user_id: str, family_id: str) -> int:
    return await refresh_tokens.revoke_family(db, user_id, family_id)


async def authenticate_user(
    db: AsyncIOMotorDatabase, email: str, password: str
) -> dict | None:
    user = await users.get_user_by_email_with_password_hash(db, email)
    dummy = _timing_safe_dummy_hash()
    if user is None:
        verify_password(password, dummy)
        return None
    ph = user.get("password_hash")
    if not ph:
        verify_password(password, dummy)
        return None
    if not verify_password(password, ph):
        return None
    return user


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    role: UserRole
    email: str
    status: Any
    token_version: int
