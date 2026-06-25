"""Lab-report analysis lifecycle, persistence, and patient scoping."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError

from app.ai.document_analysis import analyze_patient_pdf
from app.ai.lab_analysis import generate_lab_analysis
from app.config import get_settings
from app.document_text import extract_text_from_document
from app.repository import document as document_repo
from app.repository import patient as patient_repo
from app.schemas.lab_analysis import (
    AnalysisStatus,
    LabAnalysisContent,
    LabAnalysisResponse,
    LabReportAnalysis,
)

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "This AI summary is educational and may contain extraction errors. "
    "It is not a diagnosis; review the original report with a qualified clinician."
)
NO_TEXT_ERROR = (
    "No readable lab text was found. Upload a PDF with selectable text, or ask an "
    "administrator to enable OCR for scanned documents."
)
GENERIC_ERROR = "The lab report could not be analyzed. Please try again."
NOT_LAB_ERROR = "OpenAI did not identify this PDF as a lab report."
INTERRUPTED_ERROR = (
    "AI analysis was interrupted before it finished. Please retry the lab analysis."
)
_VALID_STATUSES: set[str] = {
    "not_applicable",
    "not_requested",
    "disabled",
    "queued",
    "processing",
    "completed",
    "failed",
}


def build_report_analysis(content: LabAnalysisContent) -> LabReportAnalysis:
    statuses = [metric.status for metric in content.metrics]
    normal_names = [m.name for m in content.metrics if m.status == "normal"]
    abnormal_names = [
        m.name
        for m in content.metrics
        if m.status in {"critical", "high", "low", "abnormal"}
    ]
    normal_summary = content.normal_summary.strip() or (
        f"Within the ranges printed on the report: {', '.join(normal_names)}."
        if normal_names
        else "No results could be confidently identified as within the report's printed ranges."
    )
    abnormal_summary = content.abnormal_summary.strip() or (
        f"Outside or flagged by the report: {', '.join(abnormal_names)}."
        if abnormal_names
        else "No results were explicitly flagged or outside the report's printed ranges."
    )
    next_steps = content.next_steps.strip() or (
        "Review the report with a qualified clinician, especially if results are flagged, "
        "and use the original report rather than this summary for medical decisions."
    )
    return LabReportAnalysis(
        **content.model_dump(
            exclude={"normal_summary", "abnormal_summary", "next_steps"}
        ),
        normal_summary=normal_summary,
        abnormal_summary=abnormal_summary,
        next_steps=next_steps,
        critical_count=statuses.count("critical"),
        abnormal_count=sum(
            status in {"critical", "high", "low", "abnormal"}
            for status in statuses
        ),
        normal_count=statuses.count("normal"),
        unknown_count=statuses.count("unknown"),
        disclaimer=DISCLAIMER,
    )


def _iso(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _response_from_document(doc: dict[str, Any]) -> LabAnalysisResponse:
    raw_status = str(doc.get("analysis_status") or "not_requested")
    status: AnalysisStatus = (
        raw_status if raw_status in _VALID_STATUSES else "failed"
    )  # type: ignore[assignment]
    analysis: LabReportAnalysis | None = None
    error = str(doc.get("analysis_error") or "") or None
    raw_analysis = doc.get("lab_analysis")
    if raw_analysis:
        try:
            analysis = LabReportAnalysis.model_validate(raw_analysis)
        except ValidationError:
            logger.warning(
                "Invalid stored lab analysis for document %s",
                doc.get("document_id"),
                exc_info=True,
            )
            status = "failed"
            error = GENERIC_ERROR
    return LabAnalysisResponse(
        document_id=str(doc.get("document_id") or ""),
        status=status,
        analysis=analysis,
        error=error,
        analyzed_at=_iso(doc.get("analyzed_at")),
    )


def _with_update(doc: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    """Keep the response truthful even if a mocked/racing update returns no row."""
    return {**doc, **data}


def _analysis_stale_after_seconds() -> float:
    return max(float(get_settings().AI_RUN_TIMEOUT_SECONDS) * 2 + 30, 180.0)


def _as_aware_utc(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return None


def _is_stale_incomplete_analysis(
    doc: dict[str, Any], *, now: datetime | None = None
) -> bool:
    if doc.get("category") != "lab_result":
        return False
    if doc.get("analysis_status") not in {"queued", "processing"}:
        return False

    started = _as_aware_utc(doc.get("updated_at")) or _as_aware_utc(
        doc.get("uploaded_at")
    )
    if started is None:
        return False

    current = now or datetime.now(timezone.utc)
    return (current - started).total_seconds() >= _analysis_stale_after_seconds()


async def recover_stale_lab_analysis(
    db: AsyncIOMotorDatabase, doc: dict[str, Any]
) -> dict[str, Any]:
    """Recover abandoned queued/processing analyses into a terminal state."""
    if not _is_stale_incomplete_analysis(doc):
        return doc

    raw_analysis = doc.get("lab_analysis")
    if raw_analysis:
        try:
            LabReportAnalysis.model_validate(raw_analysis)
            completed = {
                "analysis_status": "completed",
                "analysis_error": "",
                "analyzed_at": datetime.now(timezone.utc),
            }
            updated = await document_repo.update_document(
                db, str(doc["document_id"]), completed
            )
            logger.warning(
                "lab_analysis_completed_from_stale document=%s previous_status=%s",
                doc.get("document_id"),
                doc.get("analysis_status"),
            )
            return updated or _with_update(doc, completed)
        except ValidationError:
            logger.warning(
                "Invalid stale lab analysis for document %s",
                doc.get("document_id"),
                exc_info=True,
            )

    failure = {
        "analysis_status": "failed",
        "analysis_error": INTERRUPTED_ERROR,
        "analyzed_at": datetime.now(timezone.utc),
    }
    updated = await document_repo.update_document(
        db, str(doc["document_id"]), failure
    )
    logger.warning(
        "lab_analysis_marked_stale document=%s previous_status=%s",
        doc.get("document_id"),
        doc.get("analysis_status"),
    )
    return updated or _with_update(doc, failure)


async def _owned_lab_document(
    db: AsyncIOMotorDatabase, patient_id: str, document_id: str
) -> dict[str, Any]:
    patient = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    doc = await document_repo.get_document_by_document_id(db, document_id)
    if doc is None or str(doc.get("patient_id")) != str(patient["user_id"]):
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.get("category") != "lab_result":
        raise HTTPException(status_code=400, detail="Document is not a lab report")
    return doc


async def get_lab_analysis(
    db: AsyncIOMotorDatabase, patient_id: str, document_id: str
) -> LabAnalysisResponse:
    doc = await _owned_lab_document(db, patient_id, document_id)
    doc = await recover_stale_lab_analysis(db, doc)
    return _response_from_document(doc)


async def queue_lab_analysis(
    db: AsyncIOMotorDatabase, patient_id: str, document_id: str
) -> LabAnalysisResponse:
    await _owned_lab_document(db, patient_id, document_id)
    updated = await document_repo.update_document(
        db,
        document_id,
        {
            "analysis_status": "queued",
            "analysis_error": "",
            "lab_analysis": {},
            "analyzed_at": "",
            "text_extraction_status": "retry_requested",
        },
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return _response_from_document(updated)


async def _read_document_bytes(
    db: AsyncIOMotorDatabase, doc: dict[str, Any]
) -> bytes:
    raw_gridfs_id = doc.get("gridfs_file_id")
    try:
        gridfs_id = (
            raw_gridfs_id
            if isinstance(raw_gridfs_id, ObjectId)
            else ObjectId(str(raw_gridfs_id))
        )
    except (InvalidId, TypeError):
        return b""

    try:
        stream = await document_repo.open_download_stream(db, gridfs_id)
        return await stream.read()
    except Exception:
        logger.warning(
            "Could not read stored lab document %s",
            doc.get("document_id"),
            exc_info=True,
        )
        return b""


async def _recover_document_text(
    db: AsyncIOMotorDatabase, doc: dict[str, Any]
) -> str:
    """Retained for future OCR-enabled non-PDF document processing."""
    try:
        raw = await _read_document_bytes(db, doc)
        if not raw:
            return ""
        text = await extract_text_from_document(
            raw, str(doc.get("content_type") or "")
        )
        text = text[:100_000]
        if text:
            await document_repo.update_document(
                db,
                str(doc["document_id"]),
                {
                    "extracted_text": text,
                    "text_extraction_status": "completed",
                },
            )
        return text
    except Exception:
        logger.warning(
            "Text re-extraction failed for lab document %s",
            doc.get("document_id"),
            exc_info=True,
        )
        return ""


async def run_lab_analysis_for_document(
    db: AsyncIOMotorDatabase, document_id: str
) -> LabAnalysisResponse:
    doc = await document_repo.get_document_by_document_id(db, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.get("category") != "lab_result":
        raise HTTPException(status_code=400, detail="Document is not a lab report")

    await document_repo.update_document(
        db,
        document_id,
        {"analysis_status": "processing", "analysis_error": ""},
    )
    try:
        if str(doc.get("content_type") or "") == "application/pdf":
            raw = await _read_document_bytes(db, doc)
            if not raw:
                raise ValueError("Stored PDF bytes are unavailable")
            direct = await analyze_patient_pdf(
                raw, str(doc.get("filename") or "document.pdf")
            )
            if direct.document_type != "lab_report" or direct.lab_analysis is None:
                failure = {
                    "analysis_status": "failed",
                    "analysis_error": NOT_LAB_ERROR,
                    "lab_analysis": {},
                    "ai_document_analysis": direct.model_dump(),
                    "analyzed_at": datetime.now(timezone.utc),
                }
                updated = await document_repo.update_document(
                    db, document_id, failure
                )
                return _response_from_document(
                    updated or _with_update(doc, failure)
                )
            content = direct.lab_analysis
            direct_result = direct.model_dump()
        else:
            text = str(doc.get("extracted_text") or "").strip()
            must_reextract = doc.get("text_extraction_status") == "retry_requested"
            if must_reextract or len(text) < 10:
                text = (await _recover_document_text(db, doc)).strip()
            if len(text) < 10:
                failure = {
                    "analysis_status": "failed",
                    "analysis_error": NO_TEXT_ERROR,
                    "lab_analysis": {},
                    "analyzed_at": datetime.now(timezone.utc),
                }
                updated = await document_repo.update_document(
                    db, document_id, failure
                )
                return _response_from_document(
                    updated or _with_update(doc, failure)
                )
            content = await generate_lab_analysis(text)
            direct_result = None

        analysis = build_report_analysis(content)
        completed = {
            "analysis_status": "completed",
            "analysis_error": "",
            "lab_analysis": analysis.model_dump(),
            "analyzed_at": datetime.now(timezone.utc),
        }
        if direct_result is not None:
            completed["ai_document_analysis"] = direct_result
        updated = await document_repo.update_document(
            db,
            document_id,
            completed,
        )
        logger.info(
            "lab_analysis_completed document=%s metrics=%d abnormal=%d",
            document_id,
            len(analysis.metrics),
            analysis.abnormal_count,
        )
        return _response_from_document(updated or _with_update(doc, completed))
    except Exception:
        logger.error(
            "Lab analysis failed for document %s", document_id, exc_info=True
        )
        failure = {
            "analysis_status": "failed",
            "analysis_error": GENERIC_ERROR,
            "lab_analysis": {},
            "analyzed_at": datetime.now(timezone.utc),
        }
        updated = await document_repo.update_document(
            db,
            document_id,
            failure,
        )
        return _response_from_document(updated or _with_update(doc, failure))
