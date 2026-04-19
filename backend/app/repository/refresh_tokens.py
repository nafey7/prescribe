import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, ReturnDocument

from app.utils import utcnow

logger = logging.getLogger(__name__)

COLLECTION = "refresh_tokens"


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    coll = db[COLLECTION]
    await coll.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await coll.create_index([("user_id", ASCENDING), ("family_id", ASCENDING)])
    logger.info("Ensured indexes on %s", COLLECTION)


async def insert_token(db: AsyncIOMotorDatabase, doc: dict[str, Any]) -> None:
    await db[COLLECTION].insert_one(doc)


async def get_by_jti(db: AsyncIOMotorDatabase, jti: str) -> dict[str, Any] | None:
    return await db[COLLECTION].find_one({"_id": jti})


async def revoke_active_token(
    db: AsyncIOMotorDatabase,
    *,
    jti: str,
    user_id: str,
    replaced_by_jti: str,
) -> dict[str, Any] | None:
    """Revoke a still-active refresh row. Returns the updated doc if matched."""
    now = utcnow()
    return await db[COLLECTION].find_one_and_update(
        {"_id": jti, "user_id": user_id, "revoked_at": None},
        {"$set": {"revoked_at": now, "replaced_by_jti": replaced_by_jti}},
        return_document=ReturnDocument.AFTER,
    )


async def revoke_family(db: AsyncIOMotorDatabase, user_id: str, family_id: str) -> int:
    now = utcnow()
    result = await db[COLLECTION].update_many(
        {"user_id": user_id, "family_id": family_id},
        {"$set": {"revoked_at": now}},
    )
    return int(result.modified_count)


async def revoke_all_for_user(db: AsyncIOMotorDatabase, user_id: str) -> int:
    """Mark every refresh row for this user revoked (e.g. logout everywhere)."""
    now = utcnow()
    result = await db[COLLECTION].update_many(
        {"user_id": user_id},
        {"$set": {"revoked_at": now}},
    )
    return int(result.modified_count)
