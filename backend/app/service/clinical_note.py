"""Clinical-note publishing, patient reading, and correction workflow."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.ai.clinical_note_draft import generate_clinical_note_draft
from app.repository import clinical_note as note_repo
from app.repository import doctor as doctor_repo
from app.repository import patient as patient_repo
from app.schemas.clinical_note import (
    ClinicalNoteCorrectionResponse,
    ClinicalNoteCreate,
    ClinicalNoteDraft,
    ClinicalNoteGenerateRequest,
    ClinicalNoteListResponse,
    ClinicalNoteResponse,
    ClinicalNoteUpdate,
)
from app.service import connection as connection_service

logger = logging.getLogger(__name__)


def _doctor_display_name(doc: dict | None) -> str | None:
    if not doc:
        return None
    profile = doc.get("doctor_profile") or {}
    parts = [
        (profile.get("title") or "Dr.").strip(),
        (profile.get("first_name") or "").strip(),
        (profile.get("last_name") or "").strip(),
    ]
    name = " ".join(part for part in parts if part).strip()
    return name or (doc.get("email") or None)


def _format_patient_context(patient_doc: dict) -> str:
    profile = patient_doc.get("patient_profile") or {}

    def values(key: str, label_key: str = "name") -> str:
        output: list[str] = []
        for raw in profile.get(key) or []:
            if isinstance(raw, dict):
                label = str(raw.get(label_key) or raw.get("substance") or "").strip()
                details = [
                    str(raw.get(field) or "").strip()
                    for field in ("dosage", "frequency", "reaction", "severity")
                ]
                details = [detail for detail in details if detail]
                if label:
                    output.append(f"{label} ({', '.join(details)})" if details else label)
            elif str(raw).strip():
                output.append(str(raw).strip())
        return "; ".join(output) or "none recorded"

    name = " ".join(
        part
        for part in (
            str(profile.get("first_name") or "").strip(),
            str(profile.get("last_name") or "").strip(),
        )
        if part
    ) or "Patient"
    return "\n".join(
        [
            f"Patient: {name}",
            f"Date of birth: {profile.get('date_of_birth') or 'not recorded'}",
            f"Sex: {profile.get('sex') or 'not recorded'}",
            f"Conditions: {values('conditions')}",
            f"Medications: {values('medications')}",
            f"Allergies: {values('allergies')}",
        ]
    )


async def _canonical_patient(
    db: AsyncIOMotorDatabase, patient_id: str
) -> dict:
    patient = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


async def _doctor_patient(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> dict:
    patient = await _canonical_patient(db, patient_id)
    await connection_service.verify_connection(db, doctor_id, patient["user_id"])
    return patient


async def _responses(
    db: AsyncIOMotorDatabase, rows: list[dict]
) -> list[ClinicalNoteResponse]:
    corrections = await note_repo.latest_corrections_for_notes(
        db, [row["note_id"] for row in rows]
    )
    doctor_names: dict[str, str | None] = {}
    output: list[ClinicalNoteResponse] = []
    for row in rows:
        doctor_id = row["doctor_id"]
        if doctor_id not in doctor_names:
            doctor_names[doctor_id] = _doctor_display_name(
                await doctor_repo.get_doctor(db, doctor_id)
            )
        correction = corrections.get(row["note_id"])
        output.append(
            ClinicalNoteResponse(
                **row,
                doctor_display_name=doctor_names[doctor_id],
                correction_request=(
                    ClinicalNoteCorrectionResponse(**correction) if correction else None
                ),
            )
        )
    return output


async def generate_draft(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    body: ClinicalNoteGenerateRequest,
) -> ClinicalNoteDraft:
    patient = await _doctor_patient(db, doctor_id, patient_id)
    logger.info(
        "clinical_note_draft doctor=%s patient=%s context_len=%d",
        doctor_id,
        patient["user_id"],
        len(body.clinician_context),
    )
    try:
        return await generate_clinical_note_draft(
            note_type=body.note_type,
            encounter_date=body.encounter_date.isoformat(),
            patient_context=_format_patient_context(patient),
            clinician_context=body.clinician_context.strip(),
        )
    except Exception:
        logger.exception("Clinical note draft generation failed")
        raise HTTPException(
            status_code=503, detail="Clinical note draft generation failed. Please try again."
        ) from None


async def publish_note(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    body: ClinicalNoteCreate,
) -> ClinicalNoteResponse:
    patient = await _doctor_patient(db, doctor_id, patient_id)
    now = datetime.now(timezone.utc)
    row = await note_repo.insert_note(
        db,
        {
            "note_id": str(uuid4()),
            "patient_id": patient["user_id"],
            "doctor_id": doctor_id,
            "note_type": body.note_type.value,
            "title": body.title.strip(),
            "content": body.content.strip(),
            "encounter_date": body.encounter_date.isoformat(),
            "published_at": now,
            "updated_at": now,
        },
    )
    return (await _responses(db, [row]))[0]


async def doctor_list_notes(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    *,
    skip: int,
    limit: int,
) -> ClinicalNoteListResponse:
    patient = await _doctor_patient(db, doctor_id, patient_id)
    rows, total = await note_repo.list_notes(
        db,
        patient_ids=[patient["user_id"]],
        doctor_id=doctor_id,
        skip=skip,
        limit=limit,
    )
    return ClinicalNoteListResponse(
        notes=await _responses(db, rows), total=total, skip=skip, limit=limit
    )


async def patient_list_notes(
    db: AsyncIOMotorDatabase,
    *,
    patient_ids: list[str],
    skip: int,
    limit: int,
) -> ClinicalNoteListResponse:
    rows, total = await note_repo.list_notes(
        db, patient_ids=patient_ids, skip=skip, limit=limit
    )
    return ClinicalNoteListResponse(
        notes=await _responses(db, rows), total=total, skip=skip, limit=limit
    )


async def patient_get_note(
    db: AsyncIOMotorDatabase, *, patient_ids: list[str], note_id: str
) -> ClinicalNoteResponse:
    row = await note_repo.get_note(db, note_id, patient_ids=patient_ids)
    if row is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")
    return (await _responses(db, [row]))[0]


async def revise_note(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    note_id: str,
    body: ClinicalNoteUpdate,
) -> ClinicalNoteResponse:
    patient = await _doctor_patient(db, doctor_id, patient_id)
    fields = body.model_dump(exclude_none=True)
    fields = {key: value.strip() for key, value in fields.items()}
    fields["updated_at"] = datetime.now(timezone.utc)
    row = await note_repo.update_note(
        db,
        note_id,
        doctor_id=doctor_id,
        patient_id=patient["user_id"],
        fields=fields,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")
    return (await _responses(db, [row]))[0]


async def request_correction(
    db: AsyncIOMotorDatabase,
    *,
    patient_ids: list[str],
    comment: str,
    note_id: str,
) -> ClinicalNoteCorrectionResponse:
    note = await note_repo.get_note(db, note_id, patient_ids=patient_ids)
    if note is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")
    row = {
        "correction_id": str(uuid4()),
        "note_id": note_id,
        "patient_id": note["patient_id"],
        "doctor_id": note["doctor_id"],
        "comment": comment.strip(),
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "resolved_at": None,
        "resolution_note": None,
    }
    try:
        await note_repo.insert_correction(db, row)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409, detail="A correction request is already open for this note"
        ) from None
    return ClinicalNoteCorrectionResponse(**row)


async def resolve_correction(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    note_id: str,
    correction_id: str,
    resolution_note: str,
) -> ClinicalNoteCorrectionResponse:
    patient = await _doctor_patient(db, doctor_id, patient_id)
    note = await note_repo.get_note(
        db,
        note_id,
        patient_ids=[patient["user_id"]],
        doctor_id=doctor_id,
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")
    row = await note_repo.resolve_correction(
        db,
        correction_id,
        note_id=note_id,
        doctor_id=doctor_id,
        patient_id=patient["user_id"],
        resolved_at=datetime.now(timezone.utc),
        resolution_note=resolution_note.strip(),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Open correction request not found")
    return ClinicalNoteCorrectionResponse(**row)
