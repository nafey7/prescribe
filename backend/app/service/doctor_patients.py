"""Connection-gated access to patient profile, medical history, and documents for doctors."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import connection as connection_repo
from app.repository import doctor as doctor_repo
from app.repository import patient as patient_repo
from app.repository import patient_activity as activity_repo
from app.schemas.doctor import DoctorPatientListItem, DoctorPatientListResponse
from app.service import connection as connection_service
from app.service import document as document_service
from app.service import medical_history as medical_history_service
from app.service import patient as patient_service


def _age_from_dob(date_of_birth: str | None) -> int | None:
    if not date_of_birth:
        return None
    try:
        raw = date_of_birth[:10]
        born = datetime.strptime(raw, "%Y-%m-%d").date()
        today = date.today()
        years = today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )
        return years if years >= 0 else None
    except (ValueError, TypeError):
        return None


def _top_conditions(patient_doc: dict, *, limit: int = 3) -> list[str]:
    prof = patient_doc.get("patient_profile") or {}
    raw = prof.get("conditions") or []
    out: list[str] = []
    for c in raw:
        if isinstance(c, dict):
            name = (c.get("name") or "").strip()
            if name:
                out.append(name)
        elif isinstance(c, str) and c.strip():
            out.append(c.strip())
        if len(out) >= limit:
            break
    return out


def _dt_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


async def get_connected_patient_list(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    search: str | None,
    sort: str | None,
    skip: int,
    limit: int,
) -> DoctorPatientListResponse:
    if not await doctor_repo.doctor_exists(db, doctor_id):
        raise HTTPException(status_code=404, detail="Doctor not found")

    conns = await connection_repo.list_connected_patients(db, doctor_id)
    indexed: list[tuple[int, DoctorPatientListItem]] = []
    seq = 0

    for c in conns:
        pid = c["patient_id"]
        pdoc = await patient_repo.get_patient(db, pid)
        if not pdoc:
            continue
        prof = pdoc.get("patient_profile") or {}
        fn = (prof.get("first_name") or "").strip()
        ln = (prof.get("last_name") or "").strip()
        slug = (pdoc.get("patient_slug") or "").strip()

        responded = c.get("responded_at")
        connected_since = ""
        if isinstance(responded, datetime):
            connected_since = responded.date().isoformat()
        elif responded is not None:
            connected_since = str(responded)

        last_ts = await activity_repo.last_interaction_at(
            db,
            doctor_id,
            pdoc["user_id"],
            slug or None,
        )

        item = DoctorPatientListItem(
            patient_id=pdoc["user_id"],
            first_name=fn,
            last_name=ln,
            age=_age_from_dob(prof.get("date_of_birth")),
            sex=prof.get("sex"),
            conditions=_top_conditions(pdoc),
            connected_since=connected_since,
            last_interaction=_dt_iso(last_ts),
        )
        indexed.append((seq, item))
        seq += 1

    q = (search or "").strip().lower()
    if q:
        indexed = [
            (i, it)
            for i, it in indexed
            if q in f"{it.first_name} {it.last_name}".lower().strip()
            or q in (it.first_name or "").lower()
            or q in (it.last_name or "").lower()
        ]

    sort_key = (sort or "recent").strip().lower()
    if sort_key == "name":
        indexed.sort(
            key=lambda x: (
                (x[1].first_name or "").lower(),
                (x[1].last_name or "").lower(),
            )
        )
    elif sort_key in ("last_visit", "last_visited"):
        indexed.sort(
            key=lambda x: x[1].last_interaction or "",
            reverse=True,
        )
    else:
        indexed.sort(key=lambda x: x[0])

    items = [it for _, it in indexed]

    total = len(items)
    page = items[skip : skip + limit]

    return DoctorPatientListResponse(
        patients=page,
        total=total,
        skip=skip,
        limit=limit,
    )


async def _resolve_and_verify(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> None:
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    await connection_service.verify_connection(db, doctor_id, doc["user_id"])


async def get_connected_patient_profile(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
):
    await _resolve_and_verify(db, doctor_id, patient_id)
    return await patient_service.get_patient_profile(db, patient_id)


async def get_connected_patient_history(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
):
    await _resolve_and_verify(db, doctor_id, patient_id)
    return await medical_history_service.get_medical_history(db, patient_id)


async def list_connected_patient_documents(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    *,
    category: str | None,
    page: int,
    page_size: int,
):
    await _resolve_and_verify(db, doctor_id, patient_id)
    return await document_service.list_patient_documents(
        db, patient_id, category, page, page_size
    )


async def download_connected_patient_document(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str, document_id: str
):
    await _resolve_and_verify(db, doctor_id, patient_id)
    return await document_service.download_document(db, document_id, patient_id)
