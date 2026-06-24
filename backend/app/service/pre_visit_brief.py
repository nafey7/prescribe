"""Connection-gated evidence collection and pre-visit brief generation."""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.pre_visit_brief import generate_pre_visit_brief as run_brief_model
from app.repository import document as document_repo
from app.repository import patient as patient_repo
from app.repository import prescriptions as prescriptions_repo
from app.repository import suggestion as suggestion_repo
from app.schemas.pre_visit_brief import (
    PreVisitBriefContent,
    PreVisitBriefEvidence,
    PreVisitBriefResponse,
)
from app.service import connection as connection_service
from app.utils import utcnow

logger = logging.getLogger(__name__)

LOOKBACK_DAYS = 180
DOCUMENT_LIMIT = 8
PRESCRIPTION_LIMIT = 20
FINDING_LIMIT = 50
DOCUMENT_TEXT_LIMIT = 5_000
FINDING_SOURCE_TEXT_LIMIT = 1_000
PROFILE_ITEM_LIMIT = 30
PRESCRIPTION_MEDICATION_LIMIT = 10
FIELD_TEXT_LIMIT = 1_000


def _bounded_value(value: Any, *, depth: int = 0) -> Any:
    """Bound nested profile/finding values before they enter a model prompt."""
    if depth >= 5:
        return str(value)[:FIELD_TEXT_LIMIT]
    if isinstance(value, str):
        return value[:FIELD_TEXT_LIMIT]
    if isinstance(value, dict):
        return {
            str(key)[:100]: _bounded_value(item, depth=depth + 1)
            for key, item in list(value.items())[:30]
        }
    if isinstance(value, (list, tuple)):
        return [_bounded_value(item, depth=depth + 1) for item in value[:30]]
    return value


def _json_default(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return str(value)


def _profile_evidence(patient_doc: dict[str, Any]) -> dict[str, Any]:
    profile = patient_doc.get("patient_profile") or {}
    return {
        "patient": {
            "first_name": profile.get("first_name") or "",
            "last_name": profile.get("last_name") or "",
        },
        "current_conditions": _bounded_value(
            (profile.get("conditions") or [])[:PROFILE_ITEM_LIMIT]
        ),
        "current_medications": _bounded_value(
            (profile.get("medications") or [])[:PROFILE_ITEM_LIMIT]
        ),
        "allergies": _bounded_value(
            (profile.get("allergies") or [])[:PROFILE_ITEM_LIMIT]
        ),
    }


def _document_evidence(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "document_id": str(doc.get("document_id") or ""),
            "filename": str(doc.get("filename") or "document"),
            "category": str(doc.get("category") or "other"),
            "description": str(doc.get("description") or "")[:FIELD_TEXT_LIMIT],
            "uploaded_at": doc.get("uploaded_at"),
            "extracted_text": str(doc.get("extracted_text") or "")[:DOCUMENT_TEXT_LIMIT],
        }
        for doc in documents
    ]


def _prescription_evidence(
    prescriptions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [
        {
            "prescription_id": str(row.get("prescription_id") or ""),
            "status": row.get("status"),
            "issued_at": row.get("issued_at"),
            "updated_at": row.get("updated_at"),
            "diagnosis_summary": str(row.get("diagnosis_summary") or "")[
                :FIELD_TEXT_LIMIT
            ],
            "notes": str(row.get("notes") or "")[:FIELD_TEXT_LIMIT],
            "medications": _bounded_value(
                (row.get("medications") or [])[:PRESCRIPTION_MEDICATION_LIMIT]
            ),
        }
        for row in prescriptions
    ]


def _finding_evidence(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "suggestion_id": str(row.get("suggestion_id") or ""),
            "document_id": str(row.get("document_id") or ""),
            "category": str(row.get("category") or ""),
            "status": str(row.get("status") or ""),
            "confidence": str(row.get("confidence") or ""),
            "extracted_data": _bounded_value(row.get("extracted_data") or {}),
            "source_text": str(row.get("source_text") or "")[
                :FINDING_SOURCE_TEXT_LIMIT
            ],
            "created_at": row.get("created_at"),
        }
        for row in findings
    ]


def _empty_content() -> PreVisitBriefContent:
    return PreVisitBriefContent(
        summary=(
            "No recent documents, prescription activity, or document findings "
            f"were found in the last {LOOKBACK_DAYS} days."
        )
    )


async def generate_pre_visit_brief(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
) -> PreVisitBriefResponse:
    patient_doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if patient_doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    canonical_patient_id = str(patient_doc["user_id"])
    await connection_service.verify_connection(db, doctor_id, canonical_patient_id)

    generated_at = utcnow()
    since = generated_at - timedelta(days=LOOKBACK_DAYS)
    documents = await document_repo.list_recent_documents_for_patient(
        db,
        canonical_patient_id,
        since=since,
        limit=DOCUMENT_LIMIT,
    )
    prescriptions = await prescriptions_repo.list_prescriptions_for_patient(
        db,
        canonical_patient_id,
        since=since,
        limit=PRESCRIPTION_LIMIT,
    )
    raw_findings = await suggestion_repo.list_suggestions(
        db,
        canonical_patient_id,
        created_since=since,
        limit=FINDING_LIMIT,
    )
    findings = [row for row in raw_findings if row.get("status") != "rejected"]
    pending_count = sum(1 for row in findings if row.get("status") == "pending")

    evidence = PreVisitBriefEvidence(
        document_count=len(documents),
        prescription_count=len(prescriptions),
        finding_count=len(findings),
        pending_finding_count=pending_count,
    )

    if not documents and not prescriptions and not findings:
        content = _empty_content()
    else:
        packet = {
            "window_start": since,
            "generated_at": generated_at,
            "profile_baseline": _profile_evidence(patient_doc),
            "recent_documents": _document_evidence(documents),
            "recent_prescriptions": _prescription_evidence(prescriptions),
            "document_findings": _finding_evidence(findings),
        }
        content = await run_brief_model(
            json.dumps(packet, default=_json_default, ensure_ascii=False)
        )

    logger.info(
        "pre_visit_brief_request doctor=%s patient=%s docs=%d prescriptions=%d findings=%d",
        doctor_id,
        canonical_patient_id,
        evidence.document_count,
        evidence.prescription_count,
        evidence.finding_count,
    )
    return PreVisitBriefResponse(
        **content.model_dump(),
        generated_at=generated_at.isoformat(),
        lookback_days=LOOKBACK_DAYS,
        evidence=evidence,
    )
