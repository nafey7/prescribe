from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import (
    auth_bypass_allowed,
    ensure_authenticated_or_bypass,
    ensure_doctor_route,
    resolve_actor_user,
    resolve_doctor_echo_id,
)
from app.database.connection import get_database
from app.schemas.connection import ConnectionListResponse
from app.schemas.doctor import (
    DoctorDashboardResponse,
    DoctorInfo,
    DoctorListResponse,
    DoctorProfileCreate,
    DoctorProfileResponse,
    DoctorProfileUpdate,
)
from app.service import connection as connection_service
from app.service import doctor as doctor_service
from app.service import doctor_dashboard as doctor_dashboard_service
from app.service.auth import CurrentUser

router = APIRouter()


@router.post("", response_model=DoctorProfileResponse, status_code=201)
async def create_doctor_profile(
    data: DoctorProfileCreate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DoctorProfileResponse:
    if not auth_bypass_allowed():
        if actor is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        raise HTTPException(
            status_code=403,
            detail="Doctor registration is not available via this endpoint",
        )
    if actor is not None:
        raise HTTPException(
            status_code=403,
            detail="Cannot create doctor profile while authenticated",
        )
    db = get_database()
    return await doctor_service.register_doctor(db, data)


@router.get("", response_model=DoctorListResponse)
async def list_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None, description="Filter by name, email, or specialization"),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DoctorListResponse:
    ensure_authenticated_or_bypass(actor)
    db = get_database()
    return await doctor_service.list_all_doctors(
        db, skip=skip, limit=limit, search=search
    )


@router.get("/for-dev", response_model=list[DoctorInfo])
async def get_doctors_for_dev(
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> list[DoctorInfo]:
    ensure_authenticated_or_bypass(actor)
    db = get_database()
    return await doctor_service.list_doctors_for_dev(db)


@router.get("/dev/echo")
async def echo_doctor_context(
    doctor_id: str = Depends(resolve_doctor_echo_id),
) -> dict[str, str]:
    return {"doctor_id": doctor_id}


@router.get("/{doctor_id}/connections", response_model=ConnectionListResponse)
async def list_doctor_connections(
    doctor_id: str,
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ConnectionListResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await connection_service.get_doctor_connections(
        db, doctor_id, status=status, skip=skip, limit=limit
    )


@router.get("/{doctor_id}/dashboard", response_model=DoctorDashboardResponse)
async def get_doctor_dashboard(
    doctor_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DoctorDashboardResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_dashboard_service.get_doctor_dashboard(db, doctor_id)


@router.get("/{doctor_id}", response_model=DoctorProfileResponse)
async def get_doctor_profile(
    doctor_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DoctorProfileResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_service.get_doctor_profile(db, doctor_id)


@router.put("/{doctor_id}", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    doctor_id: str,
    data: DoctorProfileUpdate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DoctorProfileResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_service.update_doctor_profile(db, doctor_id, data)
