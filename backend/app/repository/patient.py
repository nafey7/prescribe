import re
from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.patient import PatientProfileCreate, PatientProfileUpdate


def _default_lifestyle() -> dict:
    return {
        "smoking_status": "unknown",
        "smoking_notes": "",
        "alcohol": "",
        "exercise": "",
        "diet_notes": "",
    }


def _slugify_names(first: str, last: str) -> str:
    raw = f"{first}_{last}".lower().strip()
    raw = re.sub(r"[^a-z0-9]+", "_", raw)
    return raw.strip("_") or "patient"


async def create_patient(db: AsyncIOMotorDatabase, data: PatientProfileCreate) -> dict:
    user_id = str(uuid4())
    now = datetime.now(timezone.utc)

    slug = data.patient_slug
    if not slug:
        slug = _slugify_names(data.first_name, data.last_name)
    slug = re.sub(r"[^a-z0-9_]", "", slug.lower())

    lifestyle = (
        data.lifestyle.model_dump()
        if data.lifestyle
        else _default_lifestyle()
    )

    patient_profile = {
        "first_name": data.first_name,
        "last_name": data.last_name,
        "date_of_birth": data.date_of_birth,
        "sex": data.sex,
        "blood_type": data.blood_type,
        "weight_kg": data.weight_kg,
        "height_cm": data.height_cm,
        "phone": data.phone,
        "address": (data.address and data.address.model_dump()) or {},
        "emergency_contact": (data.emergency_contact and data.emergency_contact.model_dump())
        or {},
        "allergies": [a.model_dump() for a in data.allergies],
        "conditions": [c.model_dump() for c in data.conditions],
        "family_history": [f.model_dump() for f in data.family_history],
        "lifestyle": lifestyle,
    }

    doc = {
        "user_id": user_id,
        "role": "patient",
        "email": data.email.lower().strip(),
        "patient_slug": slug,
        "created_at": now,
        "updated_at": now,
        "patient_profile": patient_profile,
    }
    await db.users.insert_one(doc)
    return doc


async def get_patient(db: AsyncIOMotorDatabase, user_id: str) -> dict | None:
    return await db.users.find_one({"user_id": user_id, "role": "patient"})


async def get_patient_by_email(db: AsyncIOMotorDatabase, email: str) -> dict | None:
    return await db.users.find_one(
        {"email": email.lower().strip(), "role": "patient"}
    )


async def get_patient_by_slug(db: AsyncIOMotorDatabase, patient_slug: str) -> dict | None:
    return await db.users.find_one(
        {"patient_slug": patient_slug, "role": "patient"}
    )


async def find_patient_by_id_or_slug(
    db: AsyncIOMotorDatabase, patient_id: str
) -> dict | None:
    doc = await get_patient(db, patient_id)
    if doc:
        return doc
    return await get_patient_by_slug(db, patient_id)


async def update_patient(
    db: AsyncIOMotorDatabase, user_id: str, data: PatientProfileUpdate
) -> dict | None:
    existing = await get_patient(db, user_id)
    if existing is None:
        return None

    now = datetime.now(timezone.utc)
    raw = data.model_dump(exclude_unset=True)

    set_fields: dict = {"updated_at": now}

    if "email" in raw and raw["email"] is not None:
        set_fields["email"] = raw["email"].lower().strip()

    if "patient_slug" in raw and raw["patient_slug"] is not None:
        slug = raw["patient_slug"]
        slug = re.sub(r"[^a-z0-9_]", "", slug.lower())
        set_fields["patient_slug"] = slug

    current_profile = dict(existing.get("patient_profile") or {})

    for key, value in raw.items():
        if key in ("email", "patient_slug"):
            continue
        if value is None:
            continue
        if key in ("address", "emergency_contact", "lifestyle"):
            if hasattr(value, "model_dump"):
                current_profile[key] = value.model_dump()
            elif isinstance(value, dict):
                current_profile[key] = value
        elif key in ("allergies", "conditions", "family_history"):
            current_profile[key] = [
                item.model_dump() if hasattr(item, "model_dump") else item
                for item in value
            ]
        else:
            current_profile[key] = value

    set_fields["patient_profile"] = current_profile

    await db.users.update_one(
        {"user_id": user_id, "role": "patient"},
        {"$set": set_fields},
    )
    return await get_patient(db, user_id)


async def list_patients(
    db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 50
) -> tuple[list[dict], int]:
    query = {"role": "patient"}
    total = await db.users.count_documents(query)
    cursor = (
        db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
    )
    items = await cursor.to_list(length=limit)
    return items, total


async def patient_exists(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    n = await db.users.count_documents({"user_id": user_id, "role": "patient"})
    return n > 0


async def slug_exists(db: AsyncIOMotorDatabase, patient_slug: str) -> bool:
    n = await db.users.count_documents(
        {"patient_slug": patient_slug, "role": "patient"}
    )
    return n > 0
