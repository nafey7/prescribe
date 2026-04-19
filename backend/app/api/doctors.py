from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_doctor_id
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

router = APIRouter()


@router.post("", response_model=DoctorProfileResponse, status_code=201)
async def create_doctor_profile(data: DoctorProfileCreate) -> DoctorProfileResponse:
    db = get_database()
    return await doctor_service.register_doctor(db, data)


@router.get("", response_model=DoctorListResponse)
async def list_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None, description="Filter by name, email, or specialization"),
) -> DoctorListResponse:
    db = get_database()
    return await doctor_service.list_all_doctors(
        db, skip=skip, limit=limit, search=search
    )


@router.get("/for-dev", response_model=list[DoctorInfo])
async def get_doctors_for_dev() -> list[DoctorInfo]:
    """Doctor list for the dev identity picker (`users` with role=doctor)."""
    db = get_database()
    return await doctor_service.list_doctors_for_dev(db)


@router.get("/dev/echo")
async def echo_doctor_context(
    doctor_id: str = Depends(get_current_doctor_id),
) -> dict[str, str]:
    """Confirms `X-Doctor-Id` is present; used for tests and manual header checks."""
    return {"doctor_id": doctor_id}


@router.get("/{doctor_id}/connections", response_model=ConnectionListResponse)
async def list_doctor_connections(
    doctor_id: str,
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> ConnectionListResponse:
    db = get_database()
    return await connection_service.get_doctor_connections(
        db, doctor_id, status=status, skip=skip, limit=limit
    )


@router.get("/{doctor_id}/dashboard", response_model=DoctorDashboardResponse)
async def get_doctor_dashboard(doctor_id: str) -> DoctorDashboardResponse:
    db = get_database()
    return await doctor_dashboard_service.get_doctor_dashboard(db, doctor_id)


@router.get("/{doctor_id}", response_model=DoctorProfileResponse)
async def get_doctor_profile(doctor_id: str) -> DoctorProfileResponse:
    db = get_database()
    return await doctor_service.get_doctor_profile(db, doctor_id)


@router.put("/{doctor_id}", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    doctor_id: str, data: DoctorProfileUpdate
) -> DoctorProfileResponse:
    db = get_database()
    return await doctor_service.update_doctor_profile(db, doctor_id, data)
