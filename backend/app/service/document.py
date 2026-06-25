import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import get_settings
from app.document_text import extract_text_from_document
from app.repository import document as document_repo
from app.repository import patient as patient_repo
from app.schemas.document import (
    DOCUMENT_CATEGORIES,
    DocumentListResponse,
    DocumentMetadata,
    DocumentUpdateRequest,
    DocumentUploadResponse,
)
from app.service.lab_analysis import recover_stale_lab_analysis

ALLOWED_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
    }
)

MAX_FILE_SIZES = {
    "application/pdf": 10 * 1024 * 1024,
    "image/jpeg": 5 * 1024 * 1024,
    "image/png": 5 * 1024 * 1024,
}

_SAFE_NAME = re.compile(r"[^a-zA-Z0-9._\-]+")


def _safe_filename(name: str) -> str:
    base = os.path.basename(name).strip() or "document"
    base = _SAFE_NAME.sub("_", base)
    return base[:255] if len(base) > 255 else base


def _normalize_category(raw: str) -> str:
    c = (raw or "other").strip().lower()
    if c not in DOCUMENT_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Allowed: {sorted(DOCUMENT_CATEGORIES)}",
        )
    return c


async def _resolve_patient_user_id(db: AsyncIOMotorDatabase, patient_id: str) -> str:
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return str(doc["user_id"])


def _metadata_model(doc: dict[str, Any]) -> DocumentMetadata:
    tags = doc.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    category = str(doc.get("category") or "other")
    analysis_status = str(
        doc.get("analysis_status")
        or ("not_requested" if category == "lab_result" else "not_applicable")
    )
    return DocumentMetadata(
        document_id=str(doc["document_id"]),
        patient_id=str(doc["patient_id"]),
        filename=str(doc.get("filename") or ""),
        content_type=str(doc.get("content_type") or "application/octet-stream"),
        file_size_bytes=int(doc.get("file_size_bytes") or 0),
        category=category,
        description=str(doc.get("description") or ""),
        tags=[str(t) for t in tags],
        uploaded_at=_iso(doc.get("uploaded_at")),
        updated_at=_iso(doc.get("updated_at")),
        analysis_status=analysis_status,
        analyzed_at=_iso(doc.get("analyzed_at")) or None,
    )


def _iso(dt: Any) -> str:
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


async def upload_document(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    file: UploadFile,
    category: str,
    description: str,
) -> DocumentUploadResponse:
    user_id = await _resolve_patient_user_id(db, patient_id)
    cat = _normalize_category(category)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type or 'unknown'}. "
            f"Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )
    max_sz = MAX_FILE_SIZES.get(content_type, 0)
    if len(raw) > max_sz:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {max_sz} bytes for {content_type}",
        )

    original = file.filename or "upload"
    filename = _safe_filename(original)
    now = datetime.now(timezone.utc)
    document_id = str(uuid.uuid4())
    settings = get_settings()
    extracted_text = ""
    if content_type != "application/pdf":
        # Retained for future OCR-enabled image processing. OCR is off by default.
        extracted_text = (
            await extract_text_from_document(raw, content_type)
        )[:100_000]

    analysis_status = (
        "queued"
        if content_type == "application/pdf"
        and settings.AI_SUGGESTIONS_ENABLED
        and settings.OPENAI_API_KEY
        else "disabled"
        if cat == "lab_result"
        else "not_applicable"
    )

    gridfs_id = await document_repo.upload_file(
        db, raw, filename, content_type
    )

    meta: dict[str, Any] = {
        "document_id": document_id,
        "patient_id": user_id,
        "filename": filename,
        "original_filename": original,
        "content_type": content_type,
        "file_size_bytes": len(raw),
        "gridfs_file_id": gridfs_id,
        "category": cat,
        "description": (description or "").strip(),
        "tags": [],
        "uploaded_at": now,
        "updated_at": now,
        "extracted_text": extracted_text,
        "text_extraction_status": (
            "completed" if extracted_text else "not_requested"
        ),
        "ai_document_analysis": None,
        "analysis_status": analysis_status,
        "analysis_error": None,
        "lab_analysis": None,
        "analyzed_at": None,
    }
    await document_repo.create_document(db, meta)

    return DocumentUploadResponse(
        document_id=document_id,
        filename=filename,
        content_type=content_type,
        file_size_bytes=len(raw),
        category=cat,
        description=meta["description"],
        uploaded_at=now.isoformat(),
        analysis_status=analysis_status,
    )


async def get_document_metadata(
    db: AsyncIOMotorDatabase, document_id: str, patient_id: str
) -> DocumentMetadata:
    user_id = await _resolve_patient_user_id(db, patient_id)
    doc = await document_repo.get_document_by_document_id(db, document_id)
    if doc is None or doc.get("patient_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = await recover_stale_lab_analysis(db, doc)
    return _metadata_model(doc)


async def list_patient_documents(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    category: str | None,
    page: int,
    page_size: int,
) -> DocumentListResponse:
    user_id = await _resolve_patient_user_id(db, patient_id)
    cat_filter: str | None = None
    if category and category.strip().lower() not in ("", "all"):
        cat_filter = _normalize_category(category)

    total = await document_repo.count_documents(
        db, user_id, category=cat_filter
    )
    rows = await document_repo.list_documents(
        db,
        user_id,
        category=cat_filter,
        page=page,
        page_size=page_size,
    )
    rows = [await recover_stale_lab_analysis(db, row) for row in rows]
    return DocumentListResponse(
        documents=[_metadata_model(d) for d in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def update_document_metadata(
    db: AsyncIOMotorDatabase,
    document_id: str,
    patient_id: str,
    body: DocumentUpdateRequest,
) -> DocumentMetadata:
    user_id = await _resolve_patient_user_id(db, patient_id)
    doc = await document_repo.get_document_by_document_id(db, document_id)
    if doc is None or doc.get("patient_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")

    update: dict[str, Any] = {}
    if body.category is not None:
        next_category = _normalize_category(body.category)
        update["category"] = next_category
        previous_category = str(doc.get("category") or "other")
        if next_category != previous_category:
            update["analysis_status"] = (
                "not_requested" if next_category == "lab_result" else "not_applicable"
            )
            update["analysis_error"] = None
            update["lab_analysis"] = None
            update["analyzed_at"] = None
    if body.description is not None:
        update["description"] = body.description.strip()
    if body.tags is not None:
        update["tags"] = body.tags

    updated = await document_repo.update_document(db, document_id, update)
    if updated is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return _metadata_model(updated)


async def delete_document(
    db: AsyncIOMotorDatabase, document_id: str, patient_id: str
) -> None:
    user_id = await _resolve_patient_user_id(db, patient_id)
    doc = await document_repo.get_document_by_document_id(db, document_id)
    if doc is None or doc.get("patient_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")

    gid_raw = doc.get("gridfs_file_id")
    oid: ObjectId | None
    if isinstance(gid_raw, ObjectId):
        oid = gid_raw
    else:
        try:
            oid = ObjectId(str(gid_raw))
        except (InvalidId, TypeError):
            oid = None
    if oid is not None:
        try:
            await document_repo.delete_gridfs_file(db, oid)
        except Exception:
            # Still remove metadata if GridFS entry is already gone
            pass

    await document_repo.delete_document_record(db, document_id)


async def download_document(
    db: AsyncIOMotorDatabase, document_id: str, patient_id: str
) -> tuple[AsyncIterator[bytes], str, str]:
    user_id = await _resolve_patient_user_id(db, patient_id)
    doc = await document_repo.get_document_by_document_id(db, document_id)
    if doc is None or doc.get("patient_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")

    gid = doc.get("gridfs_file_id")
    if not isinstance(gid, ObjectId):
        try:
            gid = ObjectId(gid)
        except (InvalidId, TypeError):
            raise HTTPException(status_code=404, detail="Document not found")

    grid_out = await document_repo.open_download_stream(db, gid)
    content_type = str(doc.get("content_type") or "application/octet-stream")
    fname = str(doc.get("filename") or "document")

    async def iterator() -> AsyncIterator[bytes]:
        try:
            while True:
                chunk = await grid_out.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            pass

    return iterator(), content_type, fname
