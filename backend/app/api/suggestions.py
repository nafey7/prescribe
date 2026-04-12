from fastapi import APIRouter, Query

from app.config import get_settings
from app.database.connection import get_database
from app.schemas.suggestion import SuggestionListResponse
from app.service import suggestion as suggestion_service

router = APIRouter()


@router.get("/{patient_id}/suggestions", response_model=SuggestionListResponse)
async def list_suggestions(
    patient_id: str,
    status: str | None = Query(None),
    document_id: str | None = Query(None),
    category: str | None = Query(None),
):
    settings = get_settings()
    if not settings.AI_SUGGESTIONS_ENABLED:
        return SuggestionListResponse(suggestions=[], total=0, pending_count=0)

    db = get_database()
    return await suggestion_service.list_patient_suggestions(
        db, patient_id, status=status, document_id=document_id, category=category
    )


@router.put("/{patient_id}/suggestions/{suggestion_id}/accept", status_code=204)
async def accept_suggestion(patient_id: str, suggestion_id: str):
    db = get_database()
    await suggestion_service.accept_suggestion(db, patient_id, suggestion_id)


@router.put("/{patient_id}/suggestions/{suggestion_id}/reject", status_code=204)
async def reject_suggestion(patient_id: str, suggestion_id: str):
    db = get_database()
    await suggestion_service.reject_suggestion(db, patient_id, suggestion_id)


@router.post("/{patient_id}/suggestions/accept-all", status_code=204)
async def accept_all_suggestions(
    patient_id: str,
    document_id: str | None = Query(None),
):
    db = get_database()
    await suggestion_service.accept_all_suggestions(db, patient_id, document_id)


@router.post("/{patient_id}/suggestions/reject-all", status_code=204)
async def reject_all_suggestions(
    patient_id: str,
    document_id: str | None = Query(None),
):
    db = get_database()
    await suggestion_service.reject_all_suggestions(db, patient_id, document_id)
