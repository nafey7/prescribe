"""Prescription copilot: fetch patient context, invoke AI graph, return suggestion."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.prescription_copilot_graph import generate_prescription_suggestion
from app.repository import patient as patient_repo
from app.schemas.prescription import PrescriptionSuggestionResponse
from app.service import connection as connection_service

logger = logging.getLogger(__name__)


def _render_bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items) if items else "- (none on record)"


def _format_patient_context(user_doc: dict) -> str:
    profile = user_doc.get("patient_profile") or {}

    first_name = (profile.get("first_name") or "").strip()
    last_name = (profile.get("last_name") or "").strip()
    full_name = " ".join(p for p in (first_name, last_name) if p) or "Patient"

    conditions: list[str] = []
    for c in profile.get("conditions") or []:
        name = (c.get("name") if isinstance(c, dict) else str(c) or "").strip()
        if name:
            conditions.append(name)

    medications: list[str] = []
    for m in profile.get("medications") or []:
        if not isinstance(m, dict):
            continue
        name = (m.get("name") or "").strip()
        if not name:
            continue
        parts = [name]
        for key in ("dosage", "frequency"):
            v = (m.get(key) or "").strip()
            if v:
                parts.append(v)
        medications.append(" — ".join(parts))

    allergies: list[str] = []
    for a in profile.get("allergies") or []:
        if not isinstance(a, dict):
            continue
        name = (a.get("name") or a.get("substance") or "").strip()
        if not name:
            continue
        reaction = (a.get("reaction") or "").strip()
        severity = (a.get("severity") or "").strip()
        suffix = ", ".join(p for p in (reaction, severity) if p)
        allergies.append(f"{name} ({suffix})" if suffix else name)

    family: list[str] = []
    for e in profile.get("family_history") or []:
        if not isinstance(e, dict):
            continue
        relation = (e.get("relation") or "").strip()
        condition = (e.get("condition") or "").strip()
        entry = " — ".join(p for p in (relation, condition) if p)
        if entry:
            family.append(entry)

    sections = [
        f"Patient: {full_name}",
        "",
        "Active Conditions:",
        _render_bullets(conditions),
        "",
        "Current Medications:",
        _render_bullets(medications),
        "",
        "Allergies:",
        _render_bullets(allergies),
        "",
        "Family History:",
        _render_bullets(family),
    ]
    return "\n".join(sections)


async def generate_suggestion(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    prompt: str,
) -> PrescriptionSuggestionResponse:
    patient_doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if patient_doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    await connection_service.verify_connection(db, doctor_id, patient_doc["user_id"])

    if patient_doc:
        patient_context = _format_patient_context(patient_doc)
    else:
        patient_context = "No patient profile available."

    logger.info(
        "prescription_copilot_request doctor=%s patient=%s prompt_len=%d",
        doctor_id,
        patient_id,
        len(prompt),
    )

    return await generate_prescription_suggestion(prompt, patient_context)
