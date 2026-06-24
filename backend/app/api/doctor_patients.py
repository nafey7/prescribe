from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.api.dependencies import ensure_doctor_route, resolve_actor_user
from app.database.connection import get_database
from app.schemas.document import DocumentListResponse
from app.schemas.doctor import DoctorPatientListResponse
from app.schemas.medical_history import MedicalHistoryResponse
from app.schemas.patient import PatientProfileResponse
from app.schemas.pre_visit_brief import PreVisitBriefResponse
from app.service import doctor_patients as doctor_patients_service
from app.service import pre_visit_brief as pre_visit_brief_service
from app.service.auth import CurrentUser

router = APIRouter()


@router.get("/{doctor_id}/patients", response_model=DoctorPatientListResponse)
async def list_doctor_patients(
    doctor_id: str,
    search: str | None = Query(None),
    sort: str | None = Query(
        None,
        description="recent (default), name, or last_visit",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DoctorPatientListResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_patients_service.get_connected_patient_list(
        db,
        doctor_id,
        search=search,
        sort=sort,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{doctor_id}/patients/{patient_id}/profile",
    response_model=PatientProfileResponse,
)
async def get_doctor_patient_profile(
    doctor_id: str,
    patient_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PatientProfileResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_patients_service.get_connected_patient_profile(
        db, doctor_id, patient_id
    )


@router.get(
    "/{doctor_id}/patients/{patient_id}/medical-history",
    response_model=MedicalHistoryResponse,
)
async def get_doctor_patient_medical_history(
    doctor_id: str,
    patient_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> MedicalHistoryResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_patients_service.get_connected_patient_history(
        db, doctor_id, patient_id
    )


@router.post(
    "/{doctor_id}/patients/{patient_id}/pre-visit-brief",
    response_model=PreVisitBriefResponse,
)
async def generate_doctor_patient_pre_visit_brief(
    doctor_id: str,
    patient_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PreVisitBriefResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    try:
        return await pre_visit_brief_service.generate_pre_visit_brief(
            db, doctor_id, patient_id
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Pre-visit brief generation failed. Please try again.",
        ) from None


@router.get(
    "/{doctor_id}/patients/{patient_id}/documents",
    response_model=DocumentListResponse,
)
async def list_doctor_patient_documents(
    doctor_id: str,
    patient_id: str,
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> DocumentListResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_patients_service.list_connected_patient_documents(
        db,
        doctor_id,
        patient_id,
        category=category,
        page=page,
        page_size=page_size,
    )


@router.get("/{doctor_id}/patients/{patient_id}/documents/{document_id}")
async def download_doctor_patient_document(
    doctor_id: str,
    patient_id: str,
    document_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    stream, content_type, filename = (
        await doctor_patients_service.download_connected_patient_document(
            db, doctor_id, patient_id, document_id
        )
    )
    safe = filename.replace('"', "")
    return StreamingResponse(
        stream,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe}"',
        },
    )
