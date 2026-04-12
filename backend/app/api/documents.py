from fastapi import APIRouter, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.database.connection import get_database
from app.schemas.document import (
    DocumentListResponse,
    DocumentMetadata,
    DocumentUpdateRequest,
    DocumentUploadResponse,
)
from app.service import document as document_service

router = APIRouter()


@router.post(
    "/{patient_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=201,
)
async def upload_document(
    patient_id: str,
    file: UploadFile = File(...),
    category: str = Form("other"),
    description: str = Form(""),
):
    db = get_database()
    return await document_service.upload_document(
        db, patient_id, file, category, description
    )


@router.get("/{patient_id}/documents", response_model=DocumentListResponse)
async def list_patient_documents(
    patient_id: str,
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_database()
    return await document_service.list_patient_documents(
        db, patient_id, category, page, page_size
    )


@router.get("/{patient_id}/documents/{document_id}/metadata", response_model=DocumentMetadata)
async def get_document_metadata(patient_id: str, document_id: str):
    db = get_database()
    return await document_service.get_document_metadata(db, document_id, patient_id)


@router.get("/{patient_id}/documents/{document_id}")
async def download_document(patient_id: str, document_id: str):
    db = get_database()
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
):
    db = get_database()
    return await document_service.update_document_metadata(
        db, document_id, patient_id, body
    )


@router.delete("/{patient_id}/documents/{document_id}", status_code=204)
async def delete_document(patient_id: str, document_id: str):
    db = get_database()
    await document_service.delete_document(db, document_id, patient_id)
