from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_session(
    db: AsyncIOMotorDatabase,
    chat_id: str,
    patient_id: str,
    *,
    doctor_id: str | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    session: dict = {
        "chat_id": chat_id,
        "patient_id": patient_id,
        "title": "",
        "created_at": now,
        "updated_at": now,
    }
    if doctor_id is not None:
        session["doctor_id"] = doctor_id
    await db.chat_sessions.insert_one(session)
    return session


async def get_session(db: AsyncIOMotorDatabase, chat_id: str) -> dict | None:
    return await db.chat_sessions.find_one({"chat_id": chat_id})


async def touch_session(db: AsyncIOMotorDatabase, chat_id: str) -> None:
    await db.chat_sessions.update_one(
        {"chat_id": chat_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )


async def count_messages(db: AsyncIOMotorDatabase, chat_id: str) -> int:
    return await db.chat_messages.count_documents({"chat_id": chat_id})


async def set_session_title(db: AsyncIOMotorDatabase, chat_id: str, title: str) -> None:
    cleaned = (title or "").strip()
    if len(cleaned) > 200:
        cleaned = cleaned[:199] + "…"
    await db.chat_sessions.update_one(
        {"chat_id": chat_id},
        {
            "$set": {
                "title": cleaned,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


async def save_message(
    db: AsyncIOMotorDatabase,
    chat_id: str,
    patient_id: str,
    role: str,
    content: str,
    *,
    doctor_id: str | None = None,
    message_type: str = "text",
    meal_plan: dict | None = None,
    fitness_plan: dict | None = None,
    differential_diagnosis: dict | None = None,
) -> str:
    message_id = str(uuid4())
    doc: dict = {
        "message_id": message_id,
        "chat_id": chat_id,
        "patient_id": patient_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc),
        "message_type": message_type,
    }
    if doctor_id is not None:
        doc["doctor_id"] = doctor_id
    if meal_plan is not None:
        doc["meal_plan"] = meal_plan
    if fitness_plan is not None:
        doc["fitness_plan"] = fitness_plan
    if differential_diagnosis is not None:
        doc["differential_diagnosis"] = differential_diagnosis
    await db.chat_messages.insert_one(doc)
    await touch_session(db, chat_id)
    return message_id


async def get_message(
    db: AsyncIOMotorDatabase, chat_id: str, message_id: str
) -> dict | None:
    """Return a single chat message by id, or None."""
    doc = await db.chat_messages.find_one({"chat_id": chat_id, "message_id": message_id})
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


async def get_messages(
    db: AsyncIOMotorDatabase, chat_id: str, limit: int = 50
) -> list[dict]:
    cursor = (
        db.chat_messages.find({"chat_id": chat_id})
        .sort("timestamp", 1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def list_sessions(
    db: AsyncIOMotorDatabase,
    *,
    doctor_id: str | None = None,
    patient_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[dict]:
    query: dict = {}
    if doctor_id is not None:
        query["doctor_id"] = doctor_id
    if patient_id is not None:
        query["patient_id"] = patient_id
    cursor = (
        db.chat_sessions.find(query, {"_id": 0})
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def delete_session_and_messages(db: AsyncIOMotorDatabase, chat_id: str) -> None:
    """Remove all messages and the session document for this chat."""
    await db.chat_messages.delete_many({"chat_id": chat_id})
    await db.chat_sessions.delete_one({"chat_id": chat_id})


async def get_last_assistant_snippet(
    db: AsyncIOMotorDatabase, chat_id: str, *, max_len: int = 120
) -> str:
    doc = await db.chat_messages.find_one(
        {"chat_id": chat_id, "role": "assistant"},
        sort=[("timestamp", -1)],
        projection={"content": 1, "_id": 0},
    )
    if not doc:
        return ""
    text = (doc.get("content") or "").strip().replace("\n", " ")
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


async def list_session_candidates_for_doctor(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    connected_patient_ids: list[str],
    *,
    max_fetch: int = 40,
) -> list[dict]:
    """Sessions for this doctor or any connected patient (legacy sessions may omit doctor_id)."""
    or_clauses: list[dict] = [{"doctor_id": doctor_id}]
    if connected_patient_ids:
        or_clauses.append({"patient_id": {"$in": connected_patient_ids}})
    query = {"$or": or_clauses}
    cursor = db.chat_sessions.find(query, {"_id": 0})
    items = await cursor.to_list(length=max_fetch)

    def _ts(d: dict):
        u = d.get("updated_at")
        c = d.get("created_at")
        t = u or c
        if hasattr(t, "timestamp"):
            return t.timestamp()
        return 0.0

    items.sort(key=_ts, reverse=True)
    return items
