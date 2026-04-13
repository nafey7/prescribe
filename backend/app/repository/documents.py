from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.document import PatientDocumentCreate, PatientDocumentDocument
from app.schemas.enums import DocumentType
from app.utils import utcnow


async def create_document(
    db: AsyncIOMotorDatabase, payload: PatientDocumentCreate
) -> dict:
    doc = PatientDocumentDocument(
        patient_id=payload.patient_id,
        uploaded_by_user_id=payload.uploaded_by_user_id,
        document_type=payload.document_type,
        title=payload.title,
        description=payload.description,
        file_name=payload.file_name,
        storage_key=payload.storage_key,
        mime_type=payload.mime_type,
        file_size_bytes=payload.file_size_bytes,
        visibility=payload.visibility,
        source=payload.source,
    )
    data = doc.model_dump()
    await db.patient_documents.insert_one(data)
    data.pop("_id", None)
    return data


async def get_document_by_id(
    db: AsyncIOMotorDatabase, document_id: str
) -> dict | None:
    return await db.patient_documents.find_one(
        {"document_id": document_id}, {"_id": 0}
    )


async def list_documents_for_patient(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    document_type: DocumentType | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {"patient_id": patient_id}
    if document_type is not None:
        query["document_type"] = document_type
    cursor = (
        db.patient_documents.find(query, {"_id": 0})
        .sort("uploaded_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def update_document(
    db: AsyncIOMotorDatabase, document_id: str, updates: dict
) -> dict | None:
    merged = {**updates, "updated_at": utcnow()}
    result = await db.patient_documents.find_one_and_update(
        {"document_id": document_id},
        {"$set": merged},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    return result
