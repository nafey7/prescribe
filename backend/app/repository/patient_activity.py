"""Latest interaction hints for doctor patient list (chat + prescriptions)."""

from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase


async def latest_chat_message_time(
    db: AsyncIOMotorDatabase, patient_id_values: list[str]
) -> datetime | None:
    """Most recent chat message timestamp for any of the given patient id strings (uuid or slug)."""
    uniq = [x for x in dict.fromkeys(patient_id_values) if x]
    if not uniq:
        return None
    doc = await db.chat_messages.find_one(
        {"patient_id": {"$in": uniq}},
        sort=[("timestamp", -1)],
        projection={"timestamp": 1, "_id": 0},
    )
    if not doc:
        return None
    ts = doc.get("timestamp")
    return ts if isinstance(ts, datetime) else None


async def latest_prescription_time(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_user_id: str
) -> datetime | None:
    doc = await db.prescriptions.find_one(
        {"doctor_id": doctor_id, "patient_id": patient_user_id},
        sort=[("issued_at", -1)],
        projection={"issued_at": 1, "_id": 0},
    )
    if not doc:
        return None
    ts = doc.get("issued_at")
    return ts if isinstance(ts, datetime) else None


async def last_interaction_at(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_user_id: str,
    patient_slug: str | None,
) -> datetime | None:
    id_candidates = [patient_user_id]
    if patient_slug:
        id_candidates.append(patient_slug)
    chat_ts = await latest_chat_message_time(db, id_candidates)
    rx_ts = await latest_prescription_time(db, doctor_id, patient_user_id)
    candidates = [t for t in (chat_ts, rx_ts) if t is not None]
    if not candidates:
        return None
    return max(candidates)
