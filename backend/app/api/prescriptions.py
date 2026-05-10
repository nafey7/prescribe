from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.dependencies import ensure_doctor_route, resolve_actor_user
from app.database.connection import get_database
from app.schemas.drug_interaction import (
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponse,
)
from app.schemas.enums import PrescriptionStatus
from app.schemas.prescription import (
    Medication,
    PrescriptionRead,
    PrescriptionSuggestionRequest,
    PrescriptionSuggestionResponse,
)
from app.service import drug_interaction_service
from app.service import prescription_copilot as prescription_copilot_service
from app.service import prescriptions as prescriptions_service
from app.service.auth import CurrentUser

router = APIRouter()


class PrescriptionBody(BaseModel):
    diagnosis_summary: str = ""
    notes: str = ""
    medications: list[Medication] = []


class StatusBody(BaseModel):
    status: PrescriptionStatus


@router.get(
    "/{doctor_id}/patients/{patient_id}/prescriptions",
    response_model=list[PrescriptionRead],
)
async def list_prescriptions(
    doctor_id: str,
    patient_id: str,
    status: PrescriptionStatus | None = Query(None),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> list[PrescriptionRead]:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    docs = await prescriptions_service.list_prescriptions(
        db, doctor_id, patient_id, status=status
    )
    return [PrescriptionRead(**d) for d in docs]


@router.post(
    "/{doctor_id}/patients/{patient_id}/prescriptions",
    response_model=PrescriptionRead,
    status_code=201,
)
async def create_prescription(
    doctor_id: str,
    patient_id: str,
    body: PrescriptionBody,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PrescriptionRead:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    created_by = actor.user_id if actor else doctor_id
    doc = await prescriptions_service.create_prescription(
        db,
        doctor_id,
        patient_id,
        created_by_user_id=created_by,
        diagnosis_summary=body.diagnosis_summary,
        notes=body.notes,
        medications=body.medications,
    )
    return PrescriptionRead(**doc)


@router.get(
    "/{doctor_id}/patients/{patient_id}/prescriptions/{prescription_id}",
    response_model=PrescriptionRead,
)
async def get_prescription(
    doctor_id: str,
    patient_id: str,
    prescription_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PrescriptionRead:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    doc = await prescriptions_service.get_prescription(
        db, doctor_id, patient_id, prescription_id
    )
    return PrescriptionRead(**doc)


@router.patch(
    "/{doctor_id}/patients/{patient_id}/prescriptions/{prescription_id}",
    response_model=PrescriptionRead,
)
async def update_prescription_status(
    doctor_id: str,
    patient_id: str,
    prescription_id: str,
    body: StatusBody,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PrescriptionRead:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    doc = await prescriptions_service.update_status(
        db, doctor_id, patient_id, prescription_id, body.status
    )
    return PrescriptionRead(**doc)


@router.delete(
    "/{doctor_id}/patients/{patient_id}/prescriptions/{prescription_id}",
    response_model=PrescriptionRead,
)
async def cancel_prescription(
    doctor_id: str,
    patient_id: str,
    prescription_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PrescriptionRead:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    doc = await prescriptions_service.cancel_prescription(
        db, doctor_id, patient_id, prescription_id
    )
    return PrescriptionRead(**doc)


@router.post(
    "/{doctor_id}/patients/{patient_id}/prescriptions/suggest",
    response_model=PrescriptionSuggestionResponse,
)
async def suggest_prescription(
    doctor_id: str,
    patient_id: str,
    body: PrescriptionSuggestionRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PrescriptionSuggestionResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    try:
        return await prescription_copilot_service.generate_suggestion(
            db, doctor_id, patient_id, body.prompt
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="AI suggestion failed. Please try again.",
        ) from None


@router.post(
    "/{doctor_id}/patients/{patient_id}/prescriptions/check-interactions",
    response_model=DrugInteractionCheckResponse,
)
async def check_drug_interactions_route(
    doctor_id: str,
    patient_id: str,
    body: DrugInteractionCheckRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DrugInteractionCheckResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    try:
        return await drug_interaction_service.check_interactions(
            db, doctor_id, patient_id, body
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Interaction check failed. Please try again.",
        ) from None
