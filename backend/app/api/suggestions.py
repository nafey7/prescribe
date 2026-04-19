from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import (
    assert_jwt_patient_can_access_patient_path,
    auth_bypass_allowed,
    resolve_actor_user,
)
from app.config import get_settings
from app.database.connection import get_database
from app.schemas.suggestion import SuggestionListResponse
from app.service import suggestion as suggestion_service
from app.service.auth import CurrentUser

router = APIRouter()


@router.get("/{patient_id}/suggestions", response_model=SuggestionListResponse)
async def list_suggestions(
    patient_id: str,
    status: str | None = Query(None),
    document_id: str | None = Query(None),
    category: str | None = Query(None),
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    settings = get_settings()
    if not settings.AI_SUGGESTIONS_ENABLED:
        return SuggestionListResponse(suggestions=[], total=0, pending_count=0)

    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await suggestion_service.list_patient_suggestions(
        db, patient_id, status=status, document_id=document_id, category=category
    )


@router.put("/{patient_id}/suggestions/{suggestion_id}/accept", status_code=204)
async def accept_suggestion(
    patient_id: str,
    suggestion_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    await suggestion_service.accept_suggestion(db, patient_id, suggestion_id)


@router.put("/{patient_id}/suggestions/{suggestion_id}/reject", status_code=204)
async def reject_suggestion(
    patient_id: str,
    suggestion_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    await suggestion_service.reject_suggestion(db, patient_id, suggestion_id)


@router.post("/{patient_id}/suggestions/accept-all", status_code=204)
async def accept_all_suggestions(
    patient_id: str,
    document_id: str | None = Query(None),
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    await suggestion_service.accept_all_suggestions(db, patient_id, document_id)


@router.post("/{patient_id}/suggestions/reject-all", status_code=204)
async def reject_all_suggestions(
    patient_id: str,
    document_id: str | None = Query(None),
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    await suggestion_service.reject_all_suggestions(db, patient_id, document_id)
