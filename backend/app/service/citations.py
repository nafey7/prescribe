import re

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository.patient import find_patient_by_id_or_slug
from app.schemas.citation import CitationSource


_CITATION_LINK = re.compile(
    r"\]\(#citation-(?P<source_id>[A-Za-z0-9][A-Za-z0-9_-]{0,199})\)"
)

_PROFILE_SOURCES: dict[str, tuple[str, str]] = {
    "profile-demographics": ("Demographics", "demographics"),
    "profile-conditions": ("Active conditions", "conditions"),
    "profile-medications": ("Current medications", "medications"),
    "profile-allergies": ("Allergies", "allergies"),
    "profile-family-history": ("Family history", "family-history"),
    "profile-lifestyle": ("Lifestyle", "lifestyle"),
}


def extract_citation_source_ids(answer: str) -> list[str]:
    """Return citation ids in first-appearance order, without duplicates."""
    seen: set[str] = set()
    ordered: list[str] = []
    for match in _CITATION_LINK.finditer(answer or ""):
        source_id = match.group("source_id")
        if source_id not in seen:
            seen.add(source_id)
            ordered.append(source_id)
    return ordered


async def resolve_citation_sources(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    answer: str,
) -> list[CitationSource]:
    """Resolve only sources actually cited by the model, scoped to the patient."""
    source_ids = extract_citation_source_ids(answer)
    if not source_ids:
        return []

    patient = await find_patient_by_id_or_slug(db, patient_id)
    if patient is None:
        return []
    patient_user_id = str(patient.get("user_id") or "")
    sources: list[CitationSource] = []

    for source_id in source_ids:
        profile_source = _PROFILE_SOURCES.get(source_id)
        if profile_source is not None:
            title, field = profile_source
            sources.append(
                CitationSource(
                    source_id=source_id,
                    source_type="profile_field",
                    title=title,
                    detail="Patient profile",
                    profile_field=field,
                )
            )
            continue

        if not source_id.startswith("document-") or not patient_user_id:
            continue
        document_id = source_id.removeprefix("document-")
        document = await db.documents.find_one(
            {"document_id": document_id, "patient_id": patient_user_id}
        )
        if document is None:
            continue
        filename = str(
            document.get("filename")
            or document.get("original_filename")
            or "Patient document"
        )
        category = str(document.get("category") or "document").replace("_", " ")
        sources.append(
            CitationSource(
                source_id=source_id,
                source_type="document",
                title=filename,
                detail=category.title(),
                document_id=document_id,
            )
        )

    return sources
