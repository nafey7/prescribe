from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.enums import PrescriptionStatus
from app.schemas.prescription import PrescriptionCreate, PrescriptionDocument
from app.utils import utcnow


async def create_prescription(
    db: AsyncIOMotorDatabase, payload: PrescriptionCreate
) -> dict:
    doc = PrescriptionDocument(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        created_by_user_id=payload.created_by_user_id,
        diagnosis_summary=payload.diagnosis_summary,
        notes=payload.notes,
        medications=payload.medications,
    )
    data = doc.model_dump()
    await db.prescriptions.insert_one(data)
    data.pop("_id", None)
    return data


async def get_prescription_by_id(
    db: AsyncIOMotorDatabase, prescription_id: str
) -> dict | None:
    return await db.prescriptions.find_one(
        {"prescription_id": prescription_id}, {"_id": 0}
    )


async def list_prescriptions_for_patient(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    status: PrescriptionStatus | None = None,
    since: datetime | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {"patient_id": patient_id}
    if status is not None:
        query["status"] = status
    if since is not None:
        query["issued_at"] = {"$gte": since}
    cursor = (
        db.prescriptions.find(query, {"_id": 0})
        .sort("issued_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def count_by_doctor(db: AsyncIOMotorDatabase, doctor_id: str) -> int:
    return await db.prescriptions.count_documents({"doctor_id": doctor_id})


async def list_prescriptions_for_doctor(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    status: PrescriptionStatus | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {"doctor_id": doctor_id}
    if status is not None:
        query["status"] = status
    cursor = (
        db.prescriptions.find(query, {"_id": 0})
        .sort("issued_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def update_prescription_status(
    db: AsyncIOMotorDatabase,
    prescription_id: str,
    new_status: PrescriptionStatus,
) -> dict | None:
    result = await db.prescriptions.find_one_and_update(
        {"prescription_id": prescription_id},
        {"$set": {"status": new_status, "updated_at": utcnow()}},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    return result
