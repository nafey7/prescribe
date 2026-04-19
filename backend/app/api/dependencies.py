from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Settings, get_settings
from app.database.connection import get_database
from app.repository import chat as chat_repo
from app.repository import patient as patient_repo
from app.repository import patients as patients_repo
from app.repository import users
from app.schemas.enums import UserRole, UserStatus
from app.service.auth import AuthTokenError, CurrentUser, decode_access_token

_bearer = HTTPBearer(auto_error=False)


def auth_bypass_allowed(settings: Settings | None = None) -> bool:
    """Legacy header identity is allowed only in local/test when AUTH_REQUIRED is off."""
    s = settings or get_settings()
    return (not s.AUTH_REQUIRED) and s.ENVIRONMENT in ("local", "test")


async def _build_current_user(token: str, db: AsyncIOMotorDatabase) -> CurrentUser:
    try:
        claims = decode_access_token(token)
    except AuthTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await users.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        decode_access_token(token, user=user)
    except AuthTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    status_raw = user.get("status")
    st = (
        status_raw
        if isinstance(status_raw, UserStatus)
        else UserStatus(str(status_raw))
    )
    if st != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Account is not active")
    role_raw = user.get("role")
    role = role_raw if isinstance(role_raw, UserRole) else UserRole(str(role_raw))
    return CurrentUser(
        user_id=user["user_id"],
        role=role,
        email=user["email"],
        status=user["status"],
        token_version=int(user.get("token_version", 0)),
    )


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CurrentUser:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _build_current_user(creds.credentials, db)


async def resolve_actor_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CurrentUser | None:
    if creds is None or not creds.credentials:
        if auth_bypass_allowed():
            return None
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _build_current_user(creds.credentials, db)


async def patient_id_aliases_for_user(
    db: AsyncIOMotorDatabase, user_id: str
) -> set[str]:
    ids: set[str] = {user_id}
    legacy = await patient_repo.get_patient(db, user_id)
    if legacy:
        ids.add(legacy["user_id"])
        slug = legacy.get("patient_slug")
        if slug:
            ids.add(slug)
    phase = await patients_repo.get_profile_by_user_id(db, user_id)
    if phase and phase.get("patient_id"):
        ids.add(phase["patient_id"])
    return ids


async def primary_patient_connection_id(
    db: AsyncIOMotorDatabase, user_id: str
) -> str:
    legacy = await patient_repo.get_patient(db, user_id)
    if legacy:
        return legacy["user_id"]
    phase = await patients_repo.get_profile_by_user_id(db, user_id)
    if phase and phase.get("patient_id"):
        return phase["patient_id"]
    return user_id


async def assert_jwt_patient_can_access_patient_path(
    db: AsyncIOMotorDatabase, user: CurrentUser, path_patient_id: str
) -> None:
    if user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=403,
            detail="Patient access required",
        )
    doc = await patient_repo.find_patient_by_id_or_slug(db, path_patient_id)
    if doc is not None and doc.get("user_id") == user.user_id:
        return
    phase = await patients_repo.get_profile_by_user_id(db, user.user_id)
    if phase is not None and phase.get("patient_id") == path_patient_id:
        return
    if path_patient_id == user.user_id:
        if doc is not None or phase is not None:
            return
    raise HTTPException(
        status_code=403,
        detail="Not allowed to access this patient",
    )


async def resolve_patient_chat_patient_id(
    actor: CurrentUser | None = Depends(resolve_actor_user),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> str:
    if actor is not None:
        if actor.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=403,
                detail="Patient access required",
            )
        legacy = await patient_repo.get_patient(db, actor.user_id)
        if legacy:
            return legacy.get("patient_slug") or legacy["user_id"]
        phase = await patients_repo.get_profile_by_user_id(db, actor.user_id)
        if phase:
            return phase["patient_id"]
        raise HTTPException(
            status_code=403,
            detail="No patient profile found for this user",
        )
    if auth_bypass_allowed():
        if not x_patient_id:
            raise HTTPException(
                status_code=400,
                detail="X-Patient-Id header is required",
            )
        return x_patient_id
    raise HTTPException(status_code=401, detail="Authentication required")


async def assert_patient_portal_chat_history_access(
    *,
    db: AsyncIOMotorDatabase,
    actor: CurrentUser | None,
    x_patient_id: str | None,
    chat_id: str,
) -> None:
    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    if session.get("doctor_id") is not None:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this chat session",
        )
    if actor is not None:
        if actor.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=403,
                detail="Patient access required",
            )
        ids = await patient_id_aliases_for_user(db, actor.user_id)
        if session.get("patient_id") not in ids:
            raise HTTPException(
                status_code=403,
                detail="Not authorized for this chat session",
            )
        return
    if auth_bypass_allowed():
        if not x_patient_id:
            raise HTTPException(
                status_code=400,
                detail="X-Patient-Id header is required",
            )
        ids: set[str] = {x_patient_id}
        doc = await patient_repo.find_patient_by_id_or_slug(db, x_patient_id)
        if doc:
            ids.add(doc["user_id"])
            if doc.get("patient_slug"):
                ids.add(doc["patient_slug"])
        if session.get("patient_id") not in ids:
            raise HTTPException(
                status_code=403,
                detail="Not authorized for this chat session",
            )
        return
    raise HTTPException(status_code=401, detail="Authentication required")


def require_doctor_matches_path(user: CurrentUser, path_doctor_id: str) -> None:
    if user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=403,
            detail="Doctor access required",
        )
    if path_doctor_id != user.user_id:
        raise HTTPException(
            status_code=403,
            detail="Not allowed to access this doctor",
        )


def ensure_authenticated_or_bypass(actor: CurrentUser | None) -> None:
    if actor is not None:
        return
    if auth_bypass_allowed():
        return
    raise HTTPException(status_code=401, detail="Authentication required")


def ensure_doctor_route(actor: CurrentUser | None, path_doctor_id: str) -> None:
    if actor is not None:
        require_doctor_matches_path(actor, path_doctor_id)
        return
    if auth_bypass_allowed():
        return
    raise HTTPException(status_code=401, detail="Authentication required")


async def resolve_doctor_echo_id(
    actor: CurrentUser | None = Depends(resolve_actor_user),
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
) -> str:
    if actor is not None:
        if actor.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=403,
                detail="Doctor access required",
            )
        return actor.user_id
    if auth_bypass_allowed():
        if not x_doctor_id:
            raise HTTPException(
                status_code=400,
                detail="X-Doctor-Id header is required",
            )
        return x_doctor_id
    raise HTTPException(status_code=401, detail="Authentication required")


async def get_current_patient_id(
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
) -> str:
    if not x_patient_id:
        raise HTTPException(
            status_code=400,
            detail="X-Patient-Id header is required",
        )
    return x_patient_id


async def get_current_doctor_id(
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
) -> str:
    if not x_doctor_id:
        raise HTTPException(
            status_code=400,
            detail="X-Doctor-Id header is required",
        )
    return x_doctor_id
