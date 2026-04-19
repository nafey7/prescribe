"""
Remove development seed data from MongoDB.

Usage (from `backend/` with PYTHONPATH set, or via docker compose):

    cd backend && python -m app.scripts.deseed

Deletes users matched by known demo emails, `*@patients.seed.local`, optional
`seed_source=prescribe_dev`, and dependent rows (connections, prescriptions,
chat, refresh tokens, etc.). Safe to run on an empty database.

Requires the same `MONGODB_URI` / `DATABASE_NAME` as the app.
"""

from __future__ import annotations

import asyncio
import sys
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

from app.config import get_settings
from app.scripts.seed_manifest import PATIENT_MARKDOWN_SEED_DOMAIN, SEED_SOURCE_TAG, all_known_seed_emails


def _seed_user_query() -> dict[str, Any]:
    emails = sorted(all_known_seed_emails())
    return {
        "$or": [
            {"email": {"$in": emails}},
            {"email": {"$regex": rf"@{PATIENT_MARKDOWN_SEED_DOMAIN}$", "$options": "i"}},
            {"seed_source": SEED_SOURCE_TAG},
        ]
    }


async def _collect_seed_user_ids(db) -> set[str]:
    ids: set[str] = set()
    async for doc in db.users.find(_seed_user_query(), {"user_id": 1}):
        uid = doc.get("user_id")
        if uid:
            ids.add(str(uid))
    return ids


async def _delete_gridfs_for_patient_documents(db, patient_ids: set[str]) -> int:
    removed = 0
    cursor = db.documents.find(
        {"patient_id": {"$in": list(patient_ids)}},
        {"gridfs_file_id": 1},
    )
    bucket = AsyncIOMotorGridFSBucket(db)
    async for doc in cursor:
        raw = doc.get("gridfs_file_id")
        if raw is None:
            continue
        try:
            oid = raw if isinstance(raw, ObjectId) else ObjectId(str(raw))
        except InvalidId:
            continue
        try:
            await bucket.delete(oid)
        except Exception:
            pass
        removed += 1
    await db.documents.delete_many({"patient_id": {"$in": list(patient_ids)}})
    return removed


async def deseed() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    seed_user_ids = await _collect_seed_user_ids(db)
    if not seed_user_ids:
        print("No seed users found (nothing to delete).")
        client.close()
        return

    print(f"Removing data for {len(seed_user_ids)} seed user(s)…")

    # Chat
    r = await db.chat_messages.delete_many(
        {
            "$or": [
                {"patient_id": {"$in": list(seed_user_ids)}},
                {"doctor_id": {"$in": list(seed_user_ids)}},
            ]
        }
    )
    print(f"  ✓  chat_messages: deleted {r.deleted_count}")

    r = await db.chat_sessions.delete_many(
        {
            "$or": [
                {"patient_id": {"$in": list(seed_user_ids)}},
                {"doctor_id": {"$in": list(seed_user_ids)}},
            ]
        }
    )
    print(f"  ✓  chat_sessions: deleted {r.deleted_count}")

    # Suggestions (AI)
    r = await db.suggestions.delete_many({"patient_id": {"$in": list(seed_user_ids)}})
    print(f"  ✓  suggestions: deleted {r.deleted_count}")

    # Auth sessions
    r = await db.refresh_tokens.delete_many({"user_id": {"$in": list(seed_user_ids)}})
    print(f"  ✓  refresh_tokens: deleted {r.deleted_count}")

    n_grid = await _delete_gridfs_for_patient_documents(db, seed_user_ids)
    print(f"  ✓  documents (+ GridFS): cleared {n_grid} file(s) / metadata")

    # Tagged or tied to seed users
    r = await db.prescriptions.delete_many(
        {
            "$or": [
                {"seed_source": SEED_SOURCE_TAG},
                {"patient_id": {"$in": list(seed_user_ids)}},
                {"doctor_id": {"$in": list(seed_user_ids)}},
            ]
        }
    )
    print(f"  ✓  prescriptions: deleted {r.deleted_count}")

    r = await db.patient_documents.delete_many(
        {
            "$or": [
                {"seed_source": SEED_SOURCE_TAG},
                {"patient_id": {"$in": list(seed_user_ids)}},
                {"uploaded_by_user_id": {"$in": list(seed_user_ids)}},
            ]
        }
    )
    print(f"  ✓  patient_documents: deleted {r.deleted_count}")

    r = await db.connections.delete_many(
        {
            "$or": [
                {"seed_source": SEED_SOURCE_TAG},
                {"patient_id": {"$in": list(seed_user_ids)}},
                {"doctor_id": {"$in": list(seed_user_ids)}},
            ]
        }
    )
    print(f"  ✓  connections: deleted {r.deleted_count}")

    # Legacy Phase A collections (if present)
    r = await db.doctor_patient_links.delete_many(
        {
            "$or": [
                {"patient_id": {"$in": list(seed_user_ids)}},
                {"doctor_id": {"$in": list(seed_user_ids)}},
            ]
        }
    )
    if r.deleted_count:
        print(f"  ✓  doctor_patient_links (legacy): deleted {r.deleted_count}")

    r = await db.patient_profiles.delete_many({"user_id": {"$in": list(seed_user_ids)}})
    if r.deleted_count:
        print(f"  ✓  patient_profiles (legacy): deleted {r.deleted_count}")

    r = await db.doctor_profiles.delete_many({"user_id": {"$in": list(seed_user_ids)}})
    if r.deleted_count:
        print(f"  ✓  doctor_profiles (legacy): deleted {r.deleted_count}")

    r = await db.users.delete_many(_seed_user_query())
    print(f"  ✓  users: deleted {r.deleted_count}")

    client.close()
    print("\nDeseed complete.")


def main() -> None:
    try:
        asyncio.run(deseed())
    except Exception as exc:
        print(f"\nDeseed failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    print("Removing development seed data…\n")
    main()
