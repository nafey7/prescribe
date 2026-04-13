from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.patient import PhaseAPatientProfileCreate, PatientProfileDocument
from app.utils import utcnow


async def create_profile(
    db: AsyncIOMotorDatabase, payload: PhaseAPatientProfileCreate
) -> dict:
    create_data = payload.model_dump(exclude_none=True)
    doc = PatientProfileDocument(**create_data)
    data = doc.model_dump()
    await db.patient_profiles.insert_one(data)
    data.pop("_id", None)
    return data


async def get_profile_by_patient_id(
    db: AsyncIOMotorDatabase, patient_id: str
) -> dict | None:
    return await db.patient_profiles.find_one({"patient_id": patient_id}, {"_id": 0})


async def get_profile_by_user_id(
    db: AsyncIOMotorDatabase, user_id: str
) -> dict | None:
    return await db.patient_profiles.find_one({"user_id": user_id}, {"_id": 0})


async def list_profiles(
    db: AsyncIOMotorDatabase, *, limit: int = 50
) -> list[dict]:
    cursor = (
        db.patient_profiles.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def update_profile(
    db: AsyncIOMotorDatabase, patient_id: str, updates: dict
) -> dict | None:
    merged = {**updates, "updated_at": utcnow()}
    result = await db.patient_profiles.find_one_and_update(
        {"patient_id": patient_id},
        {"$set": merged},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    return result
