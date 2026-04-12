"""MongoDB `documents` collection and GridFS file storage."""

import io
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket


def _bucket(db: AsyncIOMotorDatabase) -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db)


async def upload_file(
    db: AsyncIOMotorDatabase,
    file_data: bytes,
    filename: str,
    content_type: str,
) -> ObjectId:
    bucket = _bucket(db)
    metadata: dict[str, Any] = {"contentType": content_type}
    grid_id = await bucket.upload_from_stream(
        filename,
        io.BytesIO(file_data),
        metadata=metadata,
    )
    return grid_id


async def create_document(db: AsyncIOMotorDatabase, metadata: dict[str, Any]) -> dict[str, Any]:
    await db.documents.insert_one(metadata)
    return metadata


async def get_document_by_document_id(
    db: AsyncIOMotorDatabase, document_id: str
) -> dict[str, Any] | None:
    return await db.documents.find_one({"document_id": document_id})


async def list_documents(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    category: str | None,
    page: int,
    page_size: int,
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {"patient_id": patient_id}
    if category:
        query["category"] = category
    skip = (page - 1) * page_size
    cursor = (
        db.documents.find(query).sort("uploaded_at", -1).skip(skip).limit(page_size)
    )
    return await cursor.to_list(length=page_size)


async def count_documents(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    category: str | None,
) -> int:
    query: dict[str, Any] = {"patient_id": patient_id}
    if category:
        query["category"] = category
    return await db.documents.count_documents(query)


async def update_document(
    db: AsyncIOMotorDatabase,
    document_id: str,
    data: dict[str, Any],
) -> dict[str, Any] | None:
    data = {k: v for k, v in data.items() if v is not None}
    if not data:
        return await get_document_by_document_id(db, document_id)
    data["updated_at"] = datetime.now(timezone.utc)
    res = await db.documents.find_one_and_update(
        {"document_id": document_id},
        {"$set": data},
        return_document=ReturnDocument.AFTER,
    )
    return res


async def delete_document_record(
    db: AsyncIOMotorDatabase, document_id: str
) -> dict[str, Any] | None:
    return await db.documents.find_one_and_delete({"document_id": document_id})


async def delete_gridfs_file(db: AsyncIOMotorDatabase, gridfs_file_id: ObjectId) -> None:
    bucket = _bucket(db)
    await bucket.delete(gridfs_file_id)


async def open_download_stream(
    db: AsyncIOMotorDatabase, gridfs_file_id: ObjectId
):
    bucket = _bucket(db)
    return await bucket.open_download_stream(gridfs_file_id)


async def list_documents_for_patient(
    db: AsyncIOMotorDatabase,
    patient_user_id: str,
    *,
    limit: int = 5,
) -> list[dict]:
    """Return recent document metadata for a patient, newest first."""
    cursor = (
        db.documents.find({"patient_id": patient_user_id})
        .sort("uploaded_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


def _iso(dt: datetime | str | None) -> str:
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def document_to_summary(doc: dict) -> dict:
    return {
        "document_id": str(doc.get("document_id") or doc.get("_id") or ""),
        "filename": str(doc.get("filename") or doc.get("name") or "document"),
        "category": str(doc.get("category") or ""),
        "uploaded_at": _iso(doc.get("uploaded_at")),
    }
