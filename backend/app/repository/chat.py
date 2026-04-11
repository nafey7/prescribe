from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_session(
    db: AsyncIOMotorDatabase, chat_id: str, patient_id: str
) -> dict:
    now = datetime.now(timezone.utc)
    session = {
        "chat_id": chat_id,
        "patient_id": patient_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.chat_sessions.insert_one(session)
    return session


async def get_session(db: AsyncIOMotorDatabase, chat_id: str) -> dict | None:
    return await db.chat_sessions.find_one({"chat_id": chat_id})


async def save_message(
    db: AsyncIOMotorDatabase,
    chat_id: str,
    patient_id: str,
    role: str,
    content: str,
) -> str:
    message_id = str(uuid4())
    doc = {
        "message_id": message_id,
        "chat_id": chat_id,
        "patient_id": patient_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc),
    }
    await db.chat_messages.insert_one(doc)
    return message_id


async def get_messages(
    db: AsyncIOMotorDatabase, chat_id: str, limit: int = 50
) -> list[dict]:
    cursor = (
        db.chat_messages.find({"chat_id": chat_id})
        .sort("timestamp", 1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)
