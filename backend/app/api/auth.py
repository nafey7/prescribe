from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.dependencies import get_current_user
from app.config import get_settings
from app.database.connection import get_database
from app.repository import refresh_tokens as refresh_token_repo
from app.repository import users
from app.repository import patients as patients_repo
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    SignupRequest,
    TokenPair,
)
from app.schemas.enums import UserRole, UserStatus
from app.schemas.user import UserCreate
from app.service import auth as auth_service
from app.service.auth import (
    AuthTokenError,
    CurrentUser,
    RefreshReuseDetectedError,
    authenticate_user,
    hash_password,
    issue_token_pair,
    rotate_refresh_token,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    if request.client:
        return request.client.host
    return None


def _coerce_status(raw: Any) -> UserStatus:
    return raw if isinstance(raw, UserStatus) else UserStatus(str(raw))


def _coerce_role(raw: Any) -> UserRole:
    return raw if isinstance(raw, UserRole) else UserRole(str(raw))


async def me_response_for_user(db: AsyncIOMotorDatabase, user: dict) -> MeResponse:
    role = _coerce_role(user.get("role"))
    patient_slug: str | None = None
    if role == UserRole.PATIENT:
        prof = await patients_repo.get_profile_by_user_id(db, user["user_id"])
        if prof:
            patient_slug = prof.get("patient_slug")
    return MeResponse(
        user_id=user["user_id"],
        role=role,
        email=user["email"],
        status=_coerce_status(user.get("status")),
        email_verified=bool(user.get("email_verified", False)),
        profile_completed=bool(user.get("profile_completed", False)),
        patient_slug=patient_slug,
    )


def _resolve_signup_role(body: SignupRequest) -> UserRole:
    settings = get_settings()
    if body.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Admin signup is not allowed",
        )
    target = UserRole.PATIENT if body.role is None else body.role
    if target == UserRole.DOCTOR and not settings.ALLOW_DOCTOR_SELF_SIGNUP:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Doctor self-signup is disabled",
        )
    return target


@router.post(
    "/signup",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    request: Request,
    body: SignupRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AuthSessionResponse:
    if await users.get_user_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    role = _resolve_signup_role(body)
    created = await users.create_user(
        db,
        UserCreate(
            role=role,
            email=body.email,
            first_name=body.first_name,
            last_name=body.last_name,
            phone=None,
        ),
    )
    rounds = get_settings().BCRYPT_ROUNDS
    pw_hash = hash_password(body.password, rounds=rounds)
    updated = await users.set_password_hash(db, created["user_id"], pw_hash)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist user",
        )
    tokens = await issue_token_pair(
        db,
        updated,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    me = await me_response_for_user(db, updated)
    return AuthSessionResponse(**tokens.model_dump(), user=me)


@router.post("/login", response_model=AuthSessionResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AuthSessionResponse:
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        logger.warning(
            "auth.login_failed email_prefix=%s ip=%s",
            (body.email.split("@", 1)[0] if "@" in body.email else body.email),
            _client_ip(request),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if _coerce_status(user.get("status")) != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )
    public = await users.get_user_by_id(db, user["user_id"])
    if public is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    tokens = await issue_token_pair(
        db,
        public,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    await users.touch_last_login(db, user["user_id"])
    me = await me_response_for_user(db, public)
    return AuthSessionResponse(**tokens.model_dump(), user=me)


@router.post("/refresh", response_model=TokenPair)
async def post_refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TokenPair:
    try:
        return await rotate_refresh_token(
            db,
            body.refresh_token,
            user_agent=request.headers.get("user-agent"),
            ip=_client_ip(request),
        )
    except RefreshReuseDetectedError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from None
    except AuthTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from None


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: LogoutRequest = Body(default_factory=lambda: LogoutRequest()),
    all_sessions: bool = Query(False, alias="all"),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> None:
    payload = body
    token = payload.refresh_token
    if not token or not str(token).strip():
        return None
    try:
        claims = auth_service.decode_refresh_token(token)
    except AuthTokenError:
        return None
    user_id = claims.get("sub")
    family_id = claims.get("fid")
    if not user_id or not family_id:
        return None
    if all_sessions:
        await refresh_token_repo.revoke_all_for_user(db, user_id)
        await users.bump_token_version(db, user_id)
    else:
        await auth_service.revoke_family(db, user_id, family_id)
    return None


@router.get("/me", response_model=MeResponse)
async def get_me(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MeResponse:
    user = await users.get_user_by_id(db, current.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return await me_response_for_user(db, user)
