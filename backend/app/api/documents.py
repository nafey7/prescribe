from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.api.dependencies import (
    assert_jwt_patient_can_access_patient_path,
    auth_bypass_allowed,
    resolve_actor_user,
)
from app.config import get_settings
from app.database.connection import get_database
from app.service.auth import CurrentUser
from app.schemas.document import (
    DocumentListResponse,
    DocumentMetadata,
    DocumentUpdateRequest,
    DocumentUploadResponse,
)
from app.schemas.lab_analysis import LabAnalysisResponse
from app.service import document as document_service
from app.service.ai_suggestions import process_document_for_suggestions
from app.service import lab_analysis as lab_analysis_service

router = APIRouter()


@router.post(
    "/{patient_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=201,
)
async def upload_document(
    patient_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: str = Form("other"),
    description: str = Form(""),
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    result = await document_service.upload_document(
        db, patient_id, file, category, description
    )

    settings = get_settings()
    if settings.AI_SUGGESTIONS_ENABLED:
        background_tasks.add_task(
            process_document_for_suggestions,
            db, patient_id, result.document_id, result.category,
        )

    return result


@router.get("/{patient_id}/documents", response_model=DocumentListResponse)
async def list_patient_documents(
    patient_id: str,
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await document_service.list_patient_documents(
        db, patient_id, category, page, page_size
    )


@router.get("/{patient_id}/documents/{document_id}/metadata", response_model=DocumentMetadata)
async def get_document_metadata(
    patient_id: str,
    document_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await document_service.get_document_metadata(db, document_id, patient_id)


@router.get(
    "/{patient_id}/documents/{document_id}/analysis",
    response_model=LabAnalysisResponse,
)
async def get_document_lab_analysis(
    patient_id: str,
    document_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await lab_analysis_service.get_lab_analysis(db, patient_id, document_id)


@router.post(
    "/{patient_id}/documents/{document_id}/analysis",
    response_model=LabAnalysisResponse,
    status_code=202,
)
async def retry_document_lab_analysis(
    patient_id: str,
    document_id: str,
    background_tasks: BackgroundTasks,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    settings = get_settings()
    if not settings.AI_SUGGESTIONS_ENABLED:
        raise HTTPException(status_code=503, detail="AI document analysis is disabled")
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    response = await lab_analysis_service.queue_lab_analysis(
        db, patient_id, document_id
    )
    background_tasks.add_task(
        lab_analysis_service.run_lab_analysis_for_document, db, document_id
    )
    return response


@router.get("/{patient_id}/documents/{document_id}")
async def download_document(
    patient_id: str,
    document_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    stream, content_type, filename = await document_service.download_document(
        db, document_id, patient_id
    )
    safe = filename.replace('"', "")
    return StreamingResponse(
        stream,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe}"',
        },
    )


@router.put("/{patient_id}/documents/{document_id}", response_model=DocumentMetadata)
async def update_document_metadata(
    patient_id: str,
    document_id: str,
    body: DocumentUpdateRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await document_service.update_document_metadata(
        db, document_id, patient_id, body
    )


@router.delete("/{patient_id}/documents/{document_id}", status_code=204)
async def delete_document(
    patient_id: str,
    document_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    await document_service.delete_document(db, document_id, patient_id)
