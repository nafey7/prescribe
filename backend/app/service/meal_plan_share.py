"""Create and read meal plan shares; validate doctor–patient chat messages for PDF/share."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from app.repository import chat as chat_repo
from app.repository import doctor as doctor_repo
from app.repository import meal_plan_share as meal_plan_share_repo
from app.schemas.meal_plan import MealPlanPayload
from app.schemas.meal_plan_share import (
    MealPlanShareListItem,
    MealPlanShareListResponse,
    MealPlanShareResponse,
)
from app.service import connection as connection_service
from app.service.meal_plan_pdf import render_meal_plan_pdf

logger = logging.getLogger(__name__)

_SUMMARY_PREVIEW_LEN = 200


def _doctor_display_name(doc: dict | None) -> str | None:
    if not doc:
        return None
    prof = doc.get("doctor_profile") or {}
    title = (prof.get("title") or "Dr.").strip()
    fn = (prof.get("first_name") or "").strip()
    ln = (prof.get("last_name") or "").strip()
    if fn or ln:
        return " ".join(p for p in (title, fn, ln) if p).strip() or None
    dn = (prof.get("display_name") or "").strip()
    if dn:
        return dn
    email = (doc.get("email") or "").strip()
    return email or None


def _summary_preview(payload: MealPlanPayload) -> str | None:
    s = (payload.summary or "").strip()
    if not s:
        return None
    if len(s) <= _SUMMARY_PREVIEW_LEN:
        return s
    return s[: _SUMMARY_PREVIEW_LEN - 1] + "…"


async def _load_meal_plan_for_doctor_patient_message(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    chat_id: str,
    message_id: str,
) -> tuple[MealPlanPayload, str | None]:
    await connection_service.verify_connection(db, doctor_id, patient_id)
    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    sd = session.get("doctor_id")
    if sd is None or sd != doctor_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this chat session",
        )
    sp = session.get("patient_id")
    if sp is not None and sp != patient_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this chat session",
        )

    msg = await chat_repo.get_message(db, chat_id, message_id)
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.get("message_type") != "meal_plan":
        raise HTTPException(status_code=404, detail="Message not found")
    raw_plan = msg.get("meal_plan")
    if not raw_plan:
        raise HTTPException(status_code=404, detail="Message not found")
    try:
        payload = MealPlanPayload.model_validate(raw_plan)
    except ValidationError:
        logger.warning(
            "Invalid meal_plan on message chat_id=%s message_id=%s",
            chat_id,
            message_id,
        )
        raise HTTPException(status_code=404, detail="Message not found") from None

    chat_title = (session.get("title") or "").strip() or None
    return payload, chat_title


async def doctor_meal_plan_pdf_bytes(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    chat_id: str,
    message_id: str,
) -> bytes:
    payload, chat_title = await _load_meal_plan_for_doctor_patient_message(
        db, doctor_id, patient_id, chat_id, message_id
    )
    ddoc = await doctor_repo.get_doctor(db, doctor_id)
    subtitle = _doctor_display_name(ddoc)
    return render_meal_plan_pdf(
        payload,
        title=chat_title,
        subtitle=subtitle,
    )


async def doctor_create_share(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    chat_id: str,
    message_id: str,
) -> tuple[MealPlanShareResponse, bool]:
    """Returns (response, created). ``created`` is False when an active share already existed."""
    payload, chat_title = await _load_meal_plan_for_doctor_patient_message(
        db, doctor_id, patient_id, chat_id, message_id
    )

    existing = await meal_plan_share_repo.find_by_message(
        db, patient_id, message_id
    )
    if existing:
        return _doc_to_share_response(existing), False

    ddoc = await doctor_repo.get_doctor(db, doctor_id)
    doctor_display_name = _doctor_display_name(ddoc)
    now = datetime.now(timezone.utc)
    share_id = str(uuid4())
    doc: dict = {
        "share_id": share_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "meal_plan": payload.model_dump(mode="json"),
        "source_chat_id": chat_id,
        "source_message_id": message_id,
        "chat_title": chat_title,
        "doctor_display_name": doctor_display_name,
        "created_at": now,
        "revoked_at": None,
    }
    try:
        saved = await meal_plan_share_repo.insert_share(db, doc)
    except DuplicateKeyError:
        retry = await meal_plan_share_repo.find_by_message(
            db, patient_id, message_id
        )
        if retry:
            return _doc_to_share_response(retry), False
        logger.exception("DuplicateKey on meal plan share insert without follow-up row")
        raise HTTPException(
            status_code=409,
            detail="Could not create share",
        ) from None
    return _doc_to_share_response(saved), True


def _doc_to_share_response(doc: dict) -> MealPlanShareResponse:
    mp_raw = doc.get("meal_plan") or {}
    try:
        meal_plan = MealPlanPayload.model_validate(mp_raw)
    except ValidationError as e:
        logger.error("Corrupt meal_plan snapshot share_id=%s", doc.get("share_id"))
        raise HTTPException(
            status_code=500,
            detail="Stored meal plan is invalid",
        ) from e
    return MealPlanShareResponse(
        share_id=doc["share_id"],
        patient_id=doc["patient_id"],
        doctor_id=doc["doctor_id"],
        meal_plan=meal_plan,
        source_chat_id=doc["source_chat_id"],
        source_message_id=doc["source_message_id"],
        chat_title=doc.get("chat_title"),
        doctor_display_name=doc.get("doctor_display_name"),
        created_at=doc["created_at"],
        revoked_at=doc.get("revoked_at"),
    )


async def patient_list_shares(
    db: AsyncIOMotorDatabase,
    *,
    patient_ids: list[str],
    skip: int,
    limit: int,
) -> MealPlanShareListResponse:
    total = await meal_plan_share_repo.count_active_by_patient(
        db, patient_ids=patient_ids
    )
    rows = await meal_plan_share_repo.find_by_patient(
        db, patient_ids=patient_ids, skip=skip, limit=limit
    )
    items: list[MealPlanShareListItem] = []
    for row in rows:
        mp_raw = row.get("meal_plan") or {}
        try:
            payload = MealPlanPayload.model_validate(mp_raw)
        except ValidationError:
            summary_line = None
        else:
            summary_line = _summary_preview(payload)
        items.append(
            MealPlanShareListItem(
                share_id=row["share_id"],
                doctor_id=row["doctor_id"],
                doctor_display_name=row.get("doctor_display_name"),
                chat_title=row.get("chat_title"),
                created_at=row["created_at"],
                summary_line=summary_line,
            )
        )
    return MealPlanShareListResponse(
        items=items, total=total, skip=skip, limit=limit
    )


async def patient_get_share(
    db: AsyncIOMotorDatabase,
    *,
    patient_ids: list[str],
    share_id: str,
) -> MealPlanShareResponse:
    doc = await meal_plan_share_repo.get_by_share_id(
        db, share_id, patient_ids=patient_ids
    )
    if doc is None or doc.get("revoked_at"):
        raise HTTPException(status_code=404, detail="Share not found")
    return _doc_to_share_response(doc)


async def patient_share_pdf_bytes(
    db: AsyncIOMotorDatabase,
    *,
    patient_ids: list[str],
    share_id: str,
) -> bytes:
    doc = await meal_plan_share_repo.get_by_share_id(
        db, share_id, patient_ids=patient_ids
    )
    if doc is None or doc.get("revoked_at"):
        raise HTTPException(status_code=404, detail="Share not found")
    mp_raw = doc.get("meal_plan") or {}
    try:
        payload = MealPlanPayload.model_validate(mp_raw)
    except ValidationError:
        raise HTTPException(status_code=404, detail="Share not found") from None
    title = (doc.get("chat_title") or "").strip() or None
    subtitle = doc.get("doctor_display_name")
    if subtitle:
        subtitle = str(subtitle).strip() or None
    return render_meal_plan_pdf(
        payload,
        title=title,
        subtitle=subtitle,
    )


__all__ = [
    "doctor_create_share",
    "doctor_meal_plan_pdf_bytes",
    "patient_get_share",
    "patient_list_shares",
    "patient_share_pdf_bytes",
]
