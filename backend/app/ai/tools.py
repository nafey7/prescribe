import logging
from functools import lru_cache
from typing import Any

from langchain_core.tools import tool
from pymongo import MongoClient
from pymongo.database import Database

from app.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_sync_db() -> Database:
    settings = get_settings()
    client = MongoClient(settings.MONGODB_URI)
    return client[settings.DATABASE_NAME]


def _find_patient(db: Database, patient_id: str) -> dict | None:
    pid = (patient_id or "").strip()
    if not pid:
        return None
    return db.users.find_one(
        {
            "role": "patient",
            "$or": [{"user_id": pid}, {"patient_slug": pid}],
        }
    )


def _format_name_list(items: list[dict] | None, *, name_key: str = "name") -> list[str]:
    out: list[str] = []
    for item in items or []:
        if isinstance(item, dict):
            value = (item.get(name_key) or "").strip()
            if value:
                out.append(value)
        elif isinstance(item, str) and item.strip():
            out.append(item.strip())
    return out


def _format_medications(meds: list[dict] | None) -> list[str]:
    lines: list[str] = []
    for m in meds or []:
        if not isinstance(m, dict):
            continue
        name = (m.get("name") or "").strip()
        if not name:
            continue
        parts: list[str] = [name]
        dosage = (m.get("dosage") or "").strip()
        frequency = (m.get("frequency") or "").strip()
        since = (m.get("since") or "").strip()
        if dosage:
            parts.append(dosage)
        if frequency:
            parts.append(frequency)
        if since:
            parts.append(f"since {since}")
        lines.append(" — ".join(parts))
    return lines


def _format_allergies(allergies: list[dict] | None) -> list[str]:
    lines: list[str] = []
    for a in allergies or []:
        if not isinstance(a, dict):
            continue
        name = (a.get("name") or a.get("substance") or "").strip()
        if not name:
            continue
        reaction = (a.get("reaction") or "").strip()
        severity = (a.get("severity") or "").strip()
        suffix_parts = [p for p in (reaction, severity) if p]
        lines.append(f"{name} ({', '.join(suffix_parts)})" if suffix_parts else name)
    return lines


def _format_family_history(entries: list[dict] | None) -> list[str]:
    lines: list[str] = []
    for e in entries or []:
        if not isinstance(e, dict):
            continue
        relation = (e.get("relation") or "").strip()
        condition = (e.get("condition") or "").strip()
        note = (e.get("note") or "").strip()
        head = " — ".join(p for p in (relation, condition) if p) or note
        if head:
            lines.append(f"{head} ({note})" if note and condition else head)
    return lines


def _format_lifestyle(lifestyle: dict | None) -> list[str]:
    if not isinstance(lifestyle, dict):
        return []
    lines: list[str] = []
    smoking = (lifestyle.get("smoking_status") or "").strip()
    smoking_notes = (lifestyle.get("smoking_notes") or "").strip()
    if smoking or smoking_notes:
        parts = [smoking] if smoking else []
        if smoking_notes:
            parts.append(smoking_notes)
        lines.append(f"Smoking: {' — '.join(parts)}")
    for key, label in (
        ("alcohol", "Alcohol"),
        ("exercise", "Exercise"),
        ("diet_notes", "Diet"),
    ):
        value = (lifestyle.get(key) or "").strip()
        if value:
            lines.append(f"{label}: {value}")
    return lines


def _format_recent_documents(db: Database, user_id: str, *, limit: int = 5) -> list[str]:
    cursor = (
        db.documents.find({"patient_id": user_id})
        .sort("uploaded_at", -1)
        .limit(limit)
    )
    lines: list[str] = []
    for d in cursor:
        title = (d.get("title") or d.get("file_name") or "Document").strip()
        doc_type = (d.get("document_type") or "").strip()
        uploaded_at = d.get("uploaded_at")
        when = ""
        if hasattr(uploaded_at, "date"):
            try:
                when = uploaded_at.date().isoformat()
            except Exception:
                when = ""
        suffix = ", ".join(p for p in (doc_type, when) if p)
        lines.append(f"{title} ({suffix})" if suffix else title)
    return lines


def _render_bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items) if items else "- (none on record)"


def _format_patient_summary(db: Database, patient_doc: dict) -> str:
    profile = patient_doc.get("patient_profile") or {}
    user_id = patient_doc.get("user_id") or ""
    first_name = (profile.get("first_name") or "").strip()
    last_name = (profile.get("last_name") or "").strip()
    full_name = " ".join(p for p in (first_name, last_name) if p) or (
        patient_doc.get("patient_slug") or "Patient"
    )

    demographics_lines: list[str] = [f"Name: {full_name}"]
    for key, label in (
        ("date_of_birth", "Date of birth"),
        ("sex", "Sex"),
        ("blood_type", "Blood type"),
        ("weight_kg", "Weight (kg)"),
        ("height_cm", "Height (cm)"),
    ):
        value = profile.get(key)
        if value not in (None, "", []):
            demographics_lines.append(f"{label}: {value}")

    conditions = _format_name_list(profile.get("conditions"))
    medications = _format_medications(profile.get("medications"))
    allergies = _format_allergies(profile.get("allergies"))
    family_history = _format_family_history(profile.get("family_history"))
    lifestyle = _format_lifestyle(profile.get("lifestyle"))
    documents = _format_recent_documents(db, user_id) if user_id else []

    sections: list[str] = [
        "## Demographics",
        "\n".join(f"- {line}" for line in demographics_lines),
        "",
        "## Active Conditions",
        _render_bullets(conditions),
        "",
        "## Current Medications",
        _render_bullets(medications),
        "",
        "## Allergies",
        _render_bullets(allergies),
        "",
        "## Family History",
        _render_bullets(family_history),
        "",
        "## Lifestyle",
        _render_bullets(lifestyle),
        "",
        "## Recent Documents",
        _render_bullets(documents),
    ]

    return "\n".join(sections).strip()


def _format_web_result_snippets(results: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for i, r in enumerate(results, 1):
        title = (r.get("title") or "").strip()
        body = (r.get("body") or "").strip()
        href = (r.get("href") or "").strip()
        if not (title or body):
            continue
        block = f"{i}. {title}\n{body}" if title else f"{i}. {body}"
        if href:
            block += f"\n   Source: {href}"
        lines.append(block)
    return "\n\n".join(lines) if lines else ""


@tool
def web_search(query: str) -> str:
    """Search the public web for information that is not in the patient chart.

    Call this when the user needs up-to-date facts, recent medical news, current
    clinical guidelines, drug labeling changes, epidemiology, or other
    time-sensitive or general knowledge that benefits from a web lookup.

    Do NOT use this for patient-specific data — use search_patient_records for that.

    IMPORTANT: Never put patient names, dates of birth, addresses, MRNs, or any
    identifying information in the query. Use generic clinical terms only.

    Args:
        query: Focused search query using generic medical terminology.

    Returns:
        Plain-text snippets from web results.
    """
    q = (query or "").strip()
    if not q:
        return "No search query was provided."

    try:
        from ddgs import DDGS

        with DDGS() as ddgs:
            raw = list(ddgs.text(q, max_results=5))
    except Exception as exc:
        logger.warning("Web search failed", exc_info=True)
        return (
            "Web search is temporarily unavailable. "
            f"({exc.__class__.__name__}) Answer from general knowledge and note uncertainty "
            "for time-sensitive facts."
        )

    if not raw:
        return (
            "No web results were returned for that query. "
            "Try a shorter or broader search, or answer from general knowledge with caveats."
        )

    formatted = _format_web_result_snippets(raw)
    if not formatted:
        return "Web results had no usable text. Try rephrasing the query."

    logger.info("Web search completed query=%r (%d chars)", q[:120], len(formatted))
    return formatted


@tool
def search_patient_records(patient_id: str, query: str = "") -> str:
    """Retrieve the medical profile for a patient to ground the AI response.

    Args:
        patient_id: The patient's `user_id` (UUID) or `patient_slug`.
        query: Optional free-text hint describing what is being asked about.

    Returns:
        A structured summary of the patient's profile, or an error message if
        no matching patient record exists in the database.
    """
    try:
        db = _get_sync_db()
    except Exception as exc:
        logger.exception("Failed to get DB handle for patient lookup")
        return f"Patient records are temporarily unavailable ({exc.__class__.__name__})."

    doc = _find_patient(db, patient_id)
    if doc is None:
        return (
            f"No patient record found for identifier '{patient_id}'. "
            "Please confirm the patient and try again."
        )

    summary = _format_patient_summary(db, doc)
    logger.info(
        "Retrieved profile for patient user_id=%s (%d chars)",
        doc.get("user_id"),
        len(summary),
    )
    return summary
