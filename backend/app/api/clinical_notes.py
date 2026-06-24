from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.dependencies import (
    assert_jwt_patient_can_access_patient_path,
    auth_bypass_allowed,
    ensure_doctor_route,
    patient_id_aliases_for_user,
    resolve_actor_user,
)
from app.database.connection import get_database
from app.repository import patient as patient_repo
from app.schemas.clinical_note import (
    ClinicalNoteCorrectionCreate,
    ClinicalNoteCorrectionResolve,
    ClinicalNoteCorrectionResponse,
    ClinicalNoteCreate,
    ClinicalNoteDraft,
    ClinicalNoteGenerateRequest,
    ClinicalNoteListResponse,
    ClinicalNoteResponse,
    ClinicalNoteUpdate,
)
from app.service import clinical_note as clinical_note_service
from app.service.auth import CurrentUser

doctor_router = APIRouter()
patient_router = APIRouter()


async def _patient_scope(
    patient_id: str, actor: CurrentUser | None
) -> tuple[AsyncIOMotorDatabase, list[str]]:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        return db, list(await patient_id_aliases_for_user(db, actor.user_id))
    if not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    patient = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    ids = [patient["user_id"]]
    if patient.get("patient_slug"):
        ids.append(patient["patient_slug"])
    return db, ids


@doctor_router.get(
    "/{doctor_id}/patients/{patient_id}/clinical-notes",
    response_model=ClinicalNoteListResponse,
)
async def list_doctor_clinical_notes(
    doctor_id: str,
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteListResponse:
    ensure_doctor_route(actor, doctor_id)
    return await clinical_note_service.doctor_list_notes(
        get_database(), doctor_id, patient_id, skip=skip, limit=limit
    )


@doctor_router.post(
    "/{doctor_id}/patients/{patient_id}/clinical-notes/generate",
    response_model=ClinicalNoteDraft,
)
async def generate_doctor_clinical_note(
    doctor_id: str,
    patient_id: str,
    body: ClinicalNoteGenerateRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteDraft:
    ensure_doctor_route(actor, doctor_id)
    return await clinical_note_service.generate_draft(
        get_database(), doctor_id, patient_id, body
    )


@doctor_router.post(
    "/{doctor_id}/patients/{patient_id}/clinical-notes",
    response_model=ClinicalNoteResponse,
    status_code=201,
)
async def publish_doctor_clinical_note(
    doctor_id: str,
    patient_id: str,
    body: ClinicalNoteCreate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteResponse:
    ensure_doctor_route(actor, doctor_id)
    return await clinical_note_service.publish_note(
        get_database(), doctor_id, patient_id, body
    )


@doctor_router.patch(
    "/{doctor_id}/patients/{patient_id}/clinical-notes/{note_id}",
    response_model=ClinicalNoteResponse,
)
async def revise_doctor_clinical_note(
    doctor_id: str,
    patient_id: str,
    note_id: str,
    body: ClinicalNoteUpdate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteResponse:
    ensure_doctor_route(actor, doctor_id)
    return await clinical_note_service.revise_note(
        get_database(), doctor_id, patient_id, note_id, body
    )


@doctor_router.post(
    "/{doctor_id}/patients/{patient_id}/clinical-notes/{note_id}/correction-requests/{correction_id}/resolve",
    response_model=ClinicalNoteCorrectionResponse,
)
async def resolve_doctor_clinical_note_correction(
    doctor_id: str,
    patient_id: str,
    note_id: str,
    correction_id: str,
    body: ClinicalNoteCorrectionResolve,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteCorrectionResponse:
    ensure_doctor_route(actor, doctor_id)
    return await clinical_note_service.resolve_correction(
        get_database(),
        doctor_id,
        patient_id,
        note_id,
        correction_id,
        body.resolution_note,
    )


@patient_router.get(
    "/{patient_id}/clinical-notes", response_model=ClinicalNoteListResponse
)
async def list_patient_clinical_notes(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteListResponse:
    db, scope = await _patient_scope(patient_id, actor)
    return await clinical_note_service.patient_list_notes(
        db, patient_ids=scope, skip=skip, limit=limit
    )


@patient_router.get(
    "/{patient_id}/clinical-notes/{note_id}", response_model=ClinicalNoteResponse
)
async def get_patient_clinical_note(
    patient_id: str,
    note_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteResponse:
    db, scope = await _patient_scope(patient_id, actor)
    return await clinical_note_service.patient_get_note(
        db, patient_ids=scope, note_id=note_id
    )


@patient_router.post(
    "/{patient_id}/clinical-notes/{note_id}/correction-requests",
    response_model=ClinicalNoteCorrectionResponse,
    status_code=201,
)
async def create_patient_clinical_note_correction(
    patient_id: str,
    note_id: str,
    body: ClinicalNoteCorrectionCreate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ClinicalNoteCorrectionResponse:
    db, scope = await _patient_scope(patient_id, actor)
    return await clinical_note_service.request_correction(
        db, patient_ids=scope, note_id=note_id, comment=body.comment
    )
