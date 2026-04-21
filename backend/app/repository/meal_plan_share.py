"""MongoDB access for `meal_plan_shares` (patient-visible meal plan snapshots)."""

from __future__ import annotations

import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

logger = logging.getLogger(__name__)

COLLECTION = "meal_plan_shares"


def _strip_mongo_id(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if doc is None:
        return None
    out = dict(doc)
    out.pop("_id", None)
    return out


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    coll = db[COLLECTION]
    await coll.create_index([("share_id", ASCENDING)], unique=True, name="share_id_unique")
    await coll.create_index(
        [("patient_id", ASCENDING), ("created_at", DESCENDING)],
        name="patient_created_list",
    )
    await coll.create_index(
        [("patient_id", ASCENDING), ("source_message_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"revoked_at": None},
        name="patient_source_message_unique_active",
    )
    logger.info("Ensured indexes on %s", COLLECTION)


async def insert_share(db: AsyncIOMotorDatabase, doc: dict[str, Any]) -> dict[str, Any]:
    """Insert a share document. Raises DuplicateKeyError if active share exists for same message."""
    await db[COLLECTION].insert_one(doc)
    return _strip_mongo_id(doc) or doc


def _patient_filter(
    patient_id: str | None,
    patient_ids: list[str] | None,
) -> dict[str, Any]:
    if patient_ids is not None:
        return {"patient_id": {"$in": patient_ids}, "revoked_at": None}
    if patient_id is None:
        raise ValueError("patient_id or patient_ids required")
    return {"patient_id": patient_id, "revoked_at": None}


async def count_active_by_patient(
    db: AsyncIOMotorDatabase,
    patient_id: str | None = None,
    *,
    patient_ids: list[str] | None = None,
) -> int:
    """Count non-revoked shares for a patient (or any id in ``patient_ids``)."""
    q = _patient_filter(patient_id, patient_ids)
    return await db[COLLECTION].count_documents(q)


async def find_by_patient(
    db: AsyncIOMotorDatabase,
    patient_id: str | None = None,
    *,
    patient_ids: list[str] | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """List non-revoked shares for a patient, newest first."""
    q = _patient_filter(patient_id, patient_ids)
    cursor = (
        db[COLLECTION]
        .find(q)
        .sort("created_at", DESCENDING)
        .skip(skip)
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    return [r for r in (_strip_mongo_id(d) for d in rows) if r is not None]


async def get_by_share_id(
    db: AsyncIOMotorDatabase,
    share_id: str,
    *,
    patient_id: str | None = None,
    patient_ids: list[str] | None = None,
) -> dict[str, Any] | None:
    """Load a share by public id. Optionally scope to one or more patient ids."""
    filt: dict[str, Any] = {"share_id": share_id}
    if patient_ids is not None:
        filt["patient_id"] = {"$in": patient_ids}
    elif patient_id is not None:
        filt["patient_id"] = patient_id
    doc = await db[COLLECTION].find_one(filt)
    return _strip_mongo_id(doc)


async def find_by_message(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    source_message_id: str,
) -> dict[str, Any] | None:
    """Return active (non-revoked) share for idempotency checks."""
    doc = await db[COLLECTION].find_one(
        {
            "patient_id": patient_id,
            "source_message_id": source_message_id,
            "revoked_at": None,
        }
    )
    return _strip_mongo_id(doc)


__all__ = [
    "COLLECTION",
    "count_active_by_patient",
    "ensure_indexes",
    "find_by_message",
    "find_by_patient",
    "get_by_share_id",
    "insert_share",
]
