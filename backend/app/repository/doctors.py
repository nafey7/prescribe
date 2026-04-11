from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.doctor import DoctorProfileCreate, DoctorProfileDocument
from app.utils import utcnow


async def create_profile(
    db: AsyncIOMotorDatabase, payload: DoctorProfileCreate
) -> dict:
    doc = DoctorProfileDocument(
        user_id=payload.user_id,
        full_name=payload.full_name,
        specialization=payload.specialization,
        license_number=payload.license_number,
        years_of_experience=payload.years_of_experience,
        clinic_name=payload.clinic_name,
        phone=payload.phone,
        bio=payload.bio,
    )
    data = doc.model_dump()
    await db.doctor_profiles.insert_one(data)
    data.pop("_id", None)
    return data


async def get_profile_by_doctor_id(
    db: AsyncIOMotorDatabase, doctor_id: str
) -> dict | None:
    return await db.doctor_profiles.find_one({"doctor_id": doctor_id}, {"_id": 0})


async def get_profile_by_user_id(
    db: AsyncIOMotorDatabase, user_id: str
) -> dict | None:
    return await db.doctor_profiles.find_one({"user_id": user_id}, {"_id": 0})


async def list_profiles(
    db: AsyncIOMotorDatabase,
    *,
    specialization: str | None = None,
    accepting_new_patients: bool | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {}
    if specialization is not None:
        query["specialization"] = specialization
    if accepting_new_patients is not None:
        query["accepting_new_patients"] = accepting_new_patients
    cursor = (
        db.doctor_profiles.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def update_profile(
    db: AsyncIOMotorDatabase, doctor_id: str, updates: dict
) -> dict | None:
    merged = {**updates, "updated_at": utcnow()}
    result = await db.doctor_profiles.find_one_and_update(
        {"doctor_id": doctor_id},
        {"$set": merged},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    return result
