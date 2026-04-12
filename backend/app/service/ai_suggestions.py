"""Extraction pipeline: document → text → LLM → suggestions."""

import json
import logging
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.extraction_prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    EXTRACTION_TARGETS,
    EXTRACTION_USER_PROMPT,
)
from app.ai.llm import get_llm
from app.config import get_settings
from app.repository import suggestion as suggestion_repo
from app.utils.document_text import extract_text_from_document

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"condition", "allergy", "medication", "lab_result"}
VALID_CONFIDENCE = {"high", "medium", "low"}


async def process_document_for_suggestions(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    document_id: str,
    category: str,
) -> None:
    """Full pipeline: fetch document → extract text → LLM → store suggestions."""
    settings = get_settings()
    if not settings.AI_SUGGESTIONS_ENABLED:
        return

    try:
        doc = await db.documents.find_one({"document_id": document_id})
        if doc is None:
            logger.warning("Document %s not found, skipping extraction", document_id)
            return

        resolved_patient_id = str(doc["patient_id"])
        logger.info(
            "Extraction pipeline: resolved patient_id %r → %r for document %s",
            patient_id, resolved_patient_id, document_id,
        )

        file_bytes = await _fetch_document_bytes(db, doc)
        if not file_bytes:
            logger.warning("Could not fetch bytes for document %s", document_id)
            return

        content_type = doc.get("content_type") or ""
        text = await extract_text_from_document(file_bytes, content_type)
        if not text or len(text.strip()) < 10:
            logger.info("No usable text extracted from document %s, skipping", document_id)
            return

        items = await _run_llm_extraction(text, category)
        if not items:
            logger.info("LLM returned no items for document %s", document_id)
            return

        items = await _check_duplicates(db, resolved_patient_id, items)

        suggestions = _build_suggestion_docs(resolved_patient_id, document_id, items)
        await suggestion_repo.create_suggestions(db, suggestions)
        logger.info(
            "Generated %d suggestions for document %s (patient %s)",
            len(suggestions), document_id, patient_id,
        )

    except Exception:
        logger.error(
            "Extraction pipeline failed for document %s", document_id, exc_info=True
        )


async def _fetch_document_bytes(db: AsyncIOMotorDatabase, doc: dict) -> bytes | None:
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket

    gid = doc.get("gridfs_file_id")
    if not isinstance(gid, ObjectId):
        try:
            gid = ObjectId(str(gid))
        except (InvalidId, TypeError):
            return None

    bucket = AsyncIOMotorGridFSBucket(db)
    try:
        stream = await bucket.open_download_stream(gid)
        return await stream.read()
    except Exception:
        logger.warning("Failed to read GridFS file for document", exc_info=True)
        return None


async def _run_llm_extraction(document_text: str, category: str) -> list[dict]:
    targets = EXTRACTION_TARGETS.get(category, EXTRACTION_TARGETS["other"])
    system_prompt = EXTRACTION_SYSTEM_PROMPT.format(
        document_category=category,
        extraction_targets=targets,
    )
    user_prompt = EXTRACTION_USER_PROMPT.format(document_text=document_text[:8000])

    llm = get_llm()
    messages = [
        ("system", system_prompt),
        ("human", user_prompt),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content if hasattr(response, "content") else str(response)
        return _parse_extraction_response(content)
    except Exception:
        logger.error("LLM extraction call failed", exc_info=True)
        return []


def _parse_extraction_response(content: str) -> list[dict]:
    """Parse the LLM response into a list of extracted items."""
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        items_raw = data.get("items", []) if isinstance(data, dict) else []

        items: list[dict] = []
        for item in items_raw:
            cat = item.get("category", "")
            conf = item.get("confidence", "medium")
            if cat not in VALID_CATEGORIES:
                continue
            if conf not in VALID_CONFIDENCE:
                conf = "medium"
            items.append({
                "category": cat,
                "confidence": conf,
                "extracted_data": item.get("extracted_data", {}),
                "source_text": item.get("source_text", ""),
            })
        return items
    except (json.JSONDecodeError, KeyError, TypeError):
        logger.warning("Failed to parse LLM extraction response", exc_info=True)
        return []


async def _check_duplicates(
    db: AsyncIOMotorDatabase, patient_id: str, items: list[dict]
) -> list[dict]:
    """Mark items that duplicate existing profile entries."""
    user = await db.users.find_one({"user_id": patient_id})
    if user is None:
        return items

    profile = user.get("patient_profile") or {}
    existing_conditions = {
        c.get("name", "").lower() for c in profile.get("conditions") or []
    }
    existing_allergies = {
        a.get("substance", "").lower() for a in profile.get("allergies") or []
    }

    for item in items:
        item["duplicate_of"] = None

        if item["category"] == "condition":
            name = (item.get("extracted_data") or {}).get("name", "").lower()
            if name and _fuzzy_match(name, existing_conditions):
                matched = _find_closest(name, existing_conditions)
                item["duplicate_of"] = f"Matches existing condition: {matched}"

        elif item["category"] == "allergy":
            substance = (item.get("extracted_data") or {}).get("substance", "").lower()
            if substance and substance in existing_allergies:
                item["duplicate_of"] = f"Matches existing allergy: {substance}"

        elif item["category"] == "medication":
            pass  # no dedup for medications in this phase

    return items


def _fuzzy_match(name: str, existing: set[str]) -> bool:
    if name in existing:
        return True
    for ex in existing:
        if name in ex or ex in name:
            return True
        if _levenshtein(name, ex) <= 2:
            return True
    return False


def _find_closest(name: str, existing: set[str]) -> str:
    if name in existing:
        return name
    for ex in existing:
        if name in ex or ex in name:
            return ex
        if _levenshtein(name, ex) <= 2:
            return ex
    return name


def _levenshtein(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            cost = 0 if c1 == c2 else 1
            curr.append(min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost))
        prev = curr
    return prev[-1]


def _build_suggestion_docs(
    patient_id: str, document_id: str, items: list[dict]
) -> list[dict]:
    now = datetime.now(timezone.utc)
    docs = []
    for item in items:
        docs.append({
            "suggestion_id": str(uuid.uuid4()),
            "patient_id": patient_id,
            "document_id": document_id,
            "category": item["category"],
            "status": "pending",
            "confidence": item["confidence"],
            "extracted_data": item.get("extracted_data", {}),
            "source_text": item.get("source_text", ""),
            "duplicate_of": item.get("duplicate_of"),
            "created_at": now,
            "resolved_at": None,
            "resolved_by": "patient",
        })
    return docs
