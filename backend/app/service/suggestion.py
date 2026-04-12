"""Suggestion CRUD + accept/reject business logic."""

import logging
from datetime import datetime

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import patient as patient_repo
from app.repository import suggestion as suggestion_repo
from app.schemas.suggestion import SuggestionListResponse, SuggestionResponse

logger = logging.getLogger(__name__)


async def _resolve_user_id(db: AsyncIOMotorDatabase, patient_id: str) -> str:
    """Resolve a patient slug or user_id to the canonical user_id (UUID)."""
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return str(doc["user_id"])


def _iso(dt: datetime | str | None) -> str:
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _to_response(doc: dict) -> SuggestionResponse:
    return SuggestionResponse(
        suggestion_id=doc["suggestion_id"],
        patient_id=doc["patient_id"],
        document_id=doc["document_id"],
        category=doc["category"],
        status=doc["status"],
        confidence=doc["confidence"],
        extracted_data=doc.get("extracted_data") or {},
        source_text=doc.get("source_text") or "",
        duplicate_of=doc.get("duplicate_of"),
        created_at=_iso(doc.get("created_at")),
    )


async def list_patient_suggestions(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    status: str | None = None,
    document_id: str | None = None,
    category: str | None = None,
) -> SuggestionListResponse:
    user_id = await _resolve_user_id(db, patient_id)
    rows = await suggestion_repo.list_suggestions(
        db, user_id, status=status, document_id=document_id, category=category
    )
    pending = await suggestion_repo.count_pending(db, user_id)
    return SuggestionListResponse(
        suggestions=[_to_response(r) for r in rows],
        total=len(rows),
        pending_count=pending,
    )


async def accept_suggestion(
    db: AsyncIOMotorDatabase, patient_id: str, suggestion_id: str
) -> None:
    user_id = await _resolve_user_id(db, patient_id)

    doc = await suggestion_repo.get_suggestion(db, suggestion_id)
    if doc is None or doc["patient_id"] != user_id:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Suggestion already resolved")

    category = doc["category"]
    extracted = doc.get("extracted_data") or {}

    if category == "condition":
        logger.info(
            "Updating patient profile: adding condition %r for user_id %s (suggestion %s)",
            extracted.get("name"), user_id, suggestion_id,
        )
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$push": {"patient_profile.conditions": extracted}},
        )
        logger.info(
            "Profile update result: matched=%d modified=%d — added condition %r for user_id %s",
            result.matched_count, result.modified_count, extracted.get("name"), user_id,
        )
    elif category == "allergy":
        logger.info(
            "Updating patient profile: adding allergy %r for user_id %s (suggestion %s)",
            extracted.get("substance"), user_id, suggestion_id,
        )
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$push": {"patient_profile.allergies": extracted}},
        )
        logger.info(
            "Profile update result: matched=%d modified=%d — added allergy %r for user_id %s",
            result.matched_count, result.modified_count, extracted.get("substance"), user_id,
        )
    elif category == "medication":
        logger.info(
            "Updating patient profile: adding medication %r for user_id %s (suggestion %s)",
            extracted.get("name"), user_id, suggestion_id,
        )
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$push": {"patient_profile.medications": extracted}},
        )
        logger.info(
            "Profile update result: matched=%d modified=%d — added medication %r for user_id %s",
            result.matched_count, result.modified_count, extracted.get("name"), user_id,
        )
    else:
        logger.info(
            "Suggestion %s (category=%s) accepted — no profile write in current phase for user_id %s",
            suggestion_id, category, user_id,
        )

    await suggestion_repo.update_suggestion_status(db, suggestion_id, "accepted")
    logger.info("Accepted suggestion %s (category=%s) for user_id %s", suggestion_id, category, user_id)


async def reject_suggestion(
    db: AsyncIOMotorDatabase, patient_id: str, suggestion_id: str
) -> None:
    user_id = await _resolve_user_id(db, patient_id)

    doc = await suggestion_repo.get_suggestion(db, suggestion_id)
    if doc is None or doc["patient_id"] != user_id:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Suggestion already resolved")

    await suggestion_repo.update_suggestion_status(db, suggestion_id, "rejected")


async def accept_all_suggestions(
    db: AsyncIOMotorDatabase, patient_id: str, document_id: str | None = None
) -> int:
    user_id = await _resolve_user_id(db, patient_id)

    pending = await suggestion_repo.list_suggestions(
        db, user_id, status="pending", document_id=document_id
    )
    for doc in pending:
        category = doc["category"]
        extracted = doc.get("extracted_data") or {}
        sid = doc.get("suggestion_id", "?")
        if category == "condition":
            logger.info(
                "Bulk accept — updating profile: adding condition %r for user_id %s (suggestion %s)",
                extracted.get("name"), user_id, sid,
            )
            result = await db.users.update_one(
                {"user_id": user_id},
                {"$push": {"patient_profile.conditions": extracted}},
            )
            logger.info(
                "Bulk accept — profile update result: matched=%d modified=%d — condition %r for user_id %s",
                result.matched_count, result.modified_count, extracted.get("name"), user_id,
            )
        elif category == "allergy":
            logger.info(
                "Bulk accept — updating profile: adding allergy %r for user_id %s (suggestion %s)",
                extracted.get("substance"), user_id, sid,
            )
            result = await db.users.update_one(
                {"user_id": user_id},
                {"$push": {"patient_profile.allergies": extracted}},
            )
            logger.info(
                "Bulk accept — profile update result: matched=%d modified=%d — allergy %r for user_id %s",
                result.matched_count, result.modified_count, extracted.get("substance"), user_id,
            )
        elif category == "medication":
            logger.info(
                "Bulk accept — updating profile: adding medication %r for user_id %s (suggestion %s)",
                extracted.get("name"), user_id, sid,
            )
            result = await db.users.update_one(
                {"user_id": user_id},
                {"$push": {"patient_profile.medications": extracted}},
            )
            logger.info(
                "Bulk accept — profile update result: matched=%d modified=%d — medication %r for user_id %s",
                result.matched_count, result.modified_count, extracted.get("name"), user_id,
            )
        else:
            logger.info(
                "Bulk accept — suggestion %s (category=%s) accepted, no profile write in current phase",
                sid, category,
            )

    count = await suggestion_repo.bulk_update_status(
        db, user_id, "accepted", document_id=document_id
    )
    logger.info("Bulk accepted %d suggestions for user_id %s", count, user_id)
    return count


async def reject_all_suggestions(
    db: AsyncIOMotorDatabase, patient_id: str, document_id: str | None = None
) -> int:
    user_id = await _resolve_user_id(db, patient_id)

    count = await suggestion_repo.bulk_update_status(
        db, user_id, "rejected", document_id=document_id
    )
    logger.info("Bulk rejected %d suggestions for user_id %s", count, user_id)
    return count


async def get_pending_count(db: AsyncIOMotorDatabase, patient_id: str) -> int:
    user_id = await _resolve_user_id(db, patient_id)
    return await suggestion_repo.count_pending(db, user_id)
