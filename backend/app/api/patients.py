from fastapi import APIRouter, HTTPException, Query

from app.database.connection import get_database
from app.schemas.connection import ConnectionListResponse
from app.schemas.chat import PatientInfo
from app.schemas.medical_history import MedicalHistoryResponse
from app.schemas.patient import (
    PatientListResponse,
    PatientProfileCreate,
    PatientProfileResponse,
    PatientProfileUpdate,
)
from app.service import connection as connection_service
from app.service import medical_history as medical_history_service
from app.service import patient as patient_service
from app.service.chat import list_patients as list_chat_patients

router = APIRouter()


@router.post("", response_model=PatientProfileResponse, status_code=201)
async def register_patient(body: PatientProfileCreate) -> PatientProfileResponse:
    db = get_database()
    return await patient_service.register_patient(db, body)


@router.get("", response_model=PatientListResponse)
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, description="Filter by name, email, or patient slug"),
) -> PatientListResponse:
    db = get_database()
    return await patient_service.list_all_patients(
        db, skip=skip, limit=limit, search=search
    )


@router.get("/for-chat", response_model=list[PatientInfo])
async def patients_for_chat() -> list[PatientInfo]:
    """Chat-oriented patient list (Markdown / DB-backed); use for dev identity picker."""
    db = get_database()
    return await list_chat_patients(db)


@router.get("/{patient_id}/connections", response_model=ConnectionListResponse)
async def list_patient_connections(
    patient_id: str,
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> ConnectionListResponse:
    db = get_database()
    return await connection_service.get_patient_connections(
        db, patient_id, status=status, skip=skip, limit=limit
    )


@router.get("/{patient_id}/medical-history", response_model=MedicalHistoryResponse)
async def get_patient_medical_history(patient_id: str) -> MedicalHistoryResponse:
    db = get_database()
    return await medical_history_service.get_medical_history(db, patient_id)


@router.get("/{patient_id}", response_model=PatientProfileResponse)
async def get_patient(patient_id: str) -> PatientProfileResponse:
    db = get_database()
    return await patient_service.get_patient_profile(db, patient_id)


@router.put("/{patient_id}", response_model=PatientProfileResponse)
async def update_patient(
    patient_id: str, body: PatientProfileUpdate
) -> PatientProfileResponse:
    db = get_database()
    from app.repository import patient as patient_repo

    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return await patient_service.update_patient_profile(db, doc["user_id"], body)
