"""MongoDB access for published clinical notes and correction requests."""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, ReturnDocument

NOTES_COLLECTION = "clinical_notes"
CORRECTIONS_COLLECTION = "clinical_note_corrections"


def _clean(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if doc is None:
        return None
    out = dict(doc)
    out.pop("_id", None)
    return out


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    notes = db[NOTES_COLLECTION]
    await notes.create_index([("note_id", ASCENDING)], unique=True, name="note_id_unique")
    await notes.create_index(
        [("patient_id", ASCENDING), ("encounter_date", DESCENDING), ("published_at", DESCENDING)],
        name="patient_note_list",
    )
    await notes.create_index(
        [("doctor_id", ASCENDING), ("patient_id", ASCENDING), ("encounter_date", DESCENDING)],
        name="doctor_patient_note_list",
    )

    corrections = db[CORRECTIONS_COLLECTION]
    await corrections.create_index(
        [("correction_id", ASCENDING)], unique=True, name="correction_id_unique"
    )
    await corrections.create_index(
        [("note_id", ASCENDING), ("created_at", DESCENDING)], name="note_correction_list"
    )
    await corrections.create_index(
        [("doctor_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)],
        name="doctor_correction_queue",
    )
    await corrections.create_index(
        [("note_id", ASCENDING), ("patient_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"status": "open"},
        name="one_open_correction_per_patient_note",
    )


async def insert_note(db: AsyncIOMotorDatabase, doc: dict[str, Any]) -> dict[str, Any]:
    await db[NOTES_COLLECTION].insert_one(doc)
    return _clean(doc) or doc


async def list_notes(
    db: AsyncIOMotorDatabase,
    *,
    patient_ids: list[str],
    doctor_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    query: dict[str, Any] = {"patient_id": {"$in": patient_ids}}
    if doctor_id is not None:
        query["doctor_id"] = doctor_id
    total = await db[NOTES_COLLECTION].count_documents(query)
    cursor = (
        db[NOTES_COLLECTION]
        .find(query)
        .sort([("encounter_date", DESCENDING), ("published_at", DESCENDING)])
        .skip(skip)
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    return [row for row in (_clean(d) for d in rows) if row is not None], total


async def get_note(
    db: AsyncIOMotorDatabase,
    note_id: str,
    *,
    patient_ids: list[str] | None = None,
    doctor_id: str | None = None,
) -> dict[str, Any] | None:
    query: dict[str, Any] = {"note_id": note_id}
    if patient_ids is not None:
        query["patient_id"] = {"$in": patient_ids}
    if doctor_id is not None:
        query["doctor_id"] = doctor_id
    return _clean(await db[NOTES_COLLECTION].find_one(query))


async def update_note(
    db: AsyncIOMotorDatabase,
    note_id: str,
    *,
    doctor_id: str,
    patient_id: str,
    fields: dict[str, Any],
) -> dict[str, Any] | None:
    doc = await db[NOTES_COLLECTION].find_one_and_update(
        {"note_id": note_id, "doctor_id": doctor_id, "patient_id": patient_id},
        {"$set": fields},
        return_document=ReturnDocument.AFTER,
    )
    return _clean(doc)


async def insert_correction(
    db: AsyncIOMotorDatabase, doc: dict[str, Any]
) -> dict[str, Any]:
    await db[CORRECTIONS_COLLECTION].insert_one(doc)
    return _clean(doc) or doc


async def latest_corrections_for_notes(
    db: AsyncIOMotorDatabase, note_ids: list[str]
) -> dict[str, dict[str, Any]]:
    if not note_ids:
        return {}
    cursor = db[CORRECTIONS_COLLECTION].find({"note_id": {"$in": note_ids}}).sort(
        "created_at", DESCENDING
    )
    rows = await cursor.to_list(length=None)
    latest: dict[str, dict[str, Any]] = {}
    for raw in rows:
        row = _clean(raw)
        if row is not None and row["note_id"] not in latest:
            latest[row["note_id"]] = row
    return latest


async def get_correction(
    db: AsyncIOMotorDatabase,
    correction_id: str,
    *,
    note_id: str,
    doctor_id: str,
    patient_id: str,
) -> dict[str, Any] | None:
    return _clean(
        await db[CORRECTIONS_COLLECTION].find_one(
            {
                "correction_id": correction_id,
                "note_id": note_id,
                "doctor_id": doctor_id,
                "patient_id": patient_id,
            }
        )
    )


async def resolve_correction(
    db: AsyncIOMotorDatabase,
    correction_id: str,
    *,
    note_id: str,
    doctor_id: str,
    patient_id: str,
    resolved_at,
    resolution_note: str,
) -> dict[str, Any] | None:
    doc = await db[CORRECTIONS_COLLECTION].find_one_and_update(
        {
            "correction_id": correction_id,
            "note_id": note_id,
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "status": "open",
        },
        {
            "$set": {
                "status": "resolved",
                "resolved_at": resolved_at,
                "resolution_note": resolution_note,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    return _clean(doc)
