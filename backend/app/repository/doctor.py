import re
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.doctor import DoctorProfileCreate
from app.utils import utcnow

_DOCTOR_QUERY = {"role": "doctor"}
_USER_PUBLIC_PROJECTION = {"_id": 0, "password_hash": 0}


def _doctor_profile_from_create(data: DoctorProfileCreate) -> dict:
    prof: dict = {
        "first_name": data.first_name.strip(),
        "last_name": data.last_name.strip(),
        "title": data.title.strip() or "Dr.",
        "specialization": data.specialization.strip(),
        "sub_specializations": list(data.sub_specializations),
        "license_number": data.license_number,
        "license_state": data.license_state,
        "npi_number": data.npi_number,
        "institution": data.institution,
        "department": data.department,
        "years_of_experience": data.years_of_experience,
        "education": [e.model_dump() for e in data.education],
        "phone": data.phone,
        "office_address": data.office_address.model_dump() if data.office_address else {},
        "accepting_new_patients": data.accepting_new_patients,
        "bio": data.bio,
    }
    return prof


async def create_doctor(db: AsyncIOMotorDatabase, data: DoctorProfileCreate) -> dict:
    user_id = str(uuid4())
    now = utcnow()
    doc = {
        "user_id": user_id,
        "role": "doctor",
        "email": data.email.lower().strip(),
        "created_at": now,
        "updated_at": now,
        "doctor_profile": _doctor_profile_from_create(data),
    }
    await db.users.insert_one(doc)
    out = await db.users.find_one({"user_id": user_id}, _USER_PUBLIC_PROJECTION)
    assert out is not None
    return out


async def get_doctor(db: AsyncIOMotorDatabase, user_id: str) -> dict | None:
    return await db.users.find_one(
        {**_DOCTOR_QUERY, "user_id": user_id},
        _USER_PUBLIC_PROJECTION,
    )


async def get_doctor_by_email(db: AsyncIOMotorDatabase, email: str) -> dict | None:
    return await db.users.find_one(
        {"email": email.lower().strip(), **_DOCTOR_QUERY},
        _USER_PUBLIC_PROJECTION,
    )


async def update_doctor(
    db: AsyncIOMotorDatabase, user_id: str, doctor_profile: dict, email: str | None
) -> dict | None:
    merged = {"doctor_profile": doctor_profile, "updated_at": utcnow()}
    if email is not None:
        merged["email"] = email.lower().strip()
    result = await db.users.find_one_and_update(
        {**_DOCTOR_QUERY, "user_id": user_id},
        {"$set": merged},
        return_document=ReturnDocument.AFTER,
        projection=_USER_PUBLIC_PROJECTION,
    )
    return result


def _doctor_list_query(search: str | None) -> dict:
    if not search or not search.strip():
        return dict(_DOCTOR_QUERY)
    q = search.strip()
    rx = {"$regex": re.escape(q), "$options": "i"}
    return {
        "$and": [
            _DOCTOR_QUERY,
            {
                "$or": [
                    {"email": rx},
                    {"doctor_profile.first_name": rx},
                    {"doctor_profile.last_name": rx},
                    {"doctor_profile.specialization": rx},
                ]
            },
        ]
    }


async def list_doctors(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
    *,
    search: str | None = None,
) -> list[dict]:
    query = _doctor_list_query(search)
    cursor = (
        db.users.find(query, _USER_PUBLIC_PROJECTION)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def count_doctors(db: AsyncIOMotorDatabase, *, search: str | None = None) -> int:
    return await db.users.count_documents(_doctor_list_query(search))


async def doctor_exists(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    n = await db.users.count_documents({**_DOCTOR_QUERY, "user_id": user_id})
    return n > 0
