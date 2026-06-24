"""MongoDB CRUD for the `suggestions` collection."""

from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_suggestions(
    db: AsyncIOMotorDatabase, suggestions: list[dict[str, Any]]
) -> None:
    if not suggestions:
        return
    await db.suggestions.insert_many(suggestions)


async def list_suggestions(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    status: str | None = None,
    document_id: str | None = None,
    category: str | None = None,
    created_since: datetime | None = None,
    limit: int = 500,
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {"patient_id": patient_id}
    if status:
        query["status"] = status
    if document_id:
        query["document_id"] = document_id
    if category:
        query["category"] = category
    if created_since is not None:
        query["created_at"] = {"$gte": created_since}
    cursor = db.suggestions.find(query).sort("created_at", -1)
    return await cursor.to_list(length=limit)


async def get_suggestion(
    db: AsyncIOMotorDatabase, suggestion_id: str
) -> dict[str, Any] | None:
    return await db.suggestions.find_one({"suggestion_id": suggestion_id})


async def update_suggestion_status(
    db: AsyncIOMotorDatabase,
    suggestion_id: str,
    status: str,
) -> dict[str, Any] | None:
    result = await db.suggestions.find_one_and_update(
        {"suggestion_id": suggestion_id},
        {
            "$set": {
                "status": status,
                "resolved_at": datetime.now(timezone.utc),
                "resolved_by": "patient",
            }
        },
        return_document=True,
    )
    return result


async def count_pending(db: AsyncIOMotorDatabase, patient_id: str) -> int:
    return await db.suggestions.count_documents(
        {"patient_id": patient_id, "status": "pending"}
    )


async def bulk_update_status(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    status: str,
    *,
    document_id: str | None = None,
) -> int:
    query: dict[str, Any] = {"patient_id": patient_id, "status": "pending"}
    if document_id:
        query["document_id"] = document_id
    result = await db.suggestions.update_many(
        query,
        {
            "$set": {
                "status": status,
                "resolved_at": datetime.now(timezone.utc),
                "resolved_by": "patient",
            }
        },
    )
    return result.modified_count
