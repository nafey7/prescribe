from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.enums import UserRole, UserStatus
from app.schemas.user import UserCreate, UserDocument
from app.utils import utcnow

_USER_PUBLIC_PROJECTION = {"_id": 0, "password_hash": 0}


async def create_user(db: AsyncIOMotorDatabase, payload: UserCreate) -> dict:
    doc = UserDocument(
        role=payload.role,
        email=payload.email,
        phone=payload.phone,
    )
    data = doc.model_dump()
    await db.users.insert_one(data)
    data.pop("_id", None)
    return data


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> dict | None:
    return await db.users.find_one(
        {"user_id": user_id}, _USER_PUBLIC_PROJECTION
    )


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> dict | None:
    return await db.users.find_one({"email": email}, _USER_PUBLIC_PROJECTION)


async def get_user_by_email_with_password_hash(
    db: AsyncIOMotorDatabase, email: str
) -> dict | None:
    """Load user including password_hash (e.g. auth verification). Prefer get_user_by_email for API."""
    return await db.users.find_one({"email": email}, {"_id": 0})


async def list_users(
    db: AsyncIOMotorDatabase,
    *,
    role: UserRole | None = None,
    status: UserStatus | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {}
    if role is not None:
        query["role"] = role
    if status is not None:
        query["status"] = status
    cursor = (
        db.users.find(query, _USER_PUBLIC_PROJECTION)
        .sort("created_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def update_user(
    db: AsyncIOMotorDatabase, user_id: str, updates: dict
) -> dict | None:
    merged = {**updates, "updated_at": utcnow()}
    result = await db.users.find_one_and_update(
        {"user_id": user_id},
        {"$set": merged},
        return_document=ReturnDocument.AFTER,
        projection=_USER_PUBLIC_PROJECTION,
    )
    return result


async def mark_profile_completed(
    db: AsyncIOMotorDatabase, user_id: str
) -> dict | None:
    return await update_user(db, user_id, {"profile_completed": True})
