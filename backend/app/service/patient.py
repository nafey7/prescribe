import re

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import connection as connection_repo
from app.repository import patient as patient_repo
from app.schemas.patient import (
    PatientListResponse,
    PatientProfileCreate,
    PatientProfileResponse,
    PatientProfileUpdate,
    document_to_profile_response,
)


async def _ensure_unique_slug(
    db: AsyncIOMotorDatabase, base_slug: str, exclude_user_id: str | None = None
) -> str:
    slug = base_slug
    suffix = 0
    while True:
        doc = await db.users.find_one({"patient_slug": slug, "role": "patient"})
        if doc is None:
            return slug
        if exclude_user_id and doc.get("user_id") == exclude_user_id:
            return slug
        suffix += 1
        slug = f"{base_slug}_{suffix}"


async def register_patient(
    db: AsyncIOMotorDatabase, data: PatientProfileCreate
) -> PatientProfileResponse:
    existing = await patient_repo.get_patient_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    base_slug = data.patient_slug
    if not base_slug:
        base_slug = re.sub(
            r"[^a-z0-9_]",
            "",
            f"{data.first_name}_{data.last_name}".lower(),
        )
    if not base_slug:
        base_slug = "patient"

    unique_slug = await _ensure_unique_slug(db, base_slug)

    create_payload = data.model_copy(update={"patient_slug": unique_slug})
    doc = await patient_repo.create_patient(db, create_payload)
    return document_to_profile_response(doc)


async def get_patient_profile(
    db: AsyncIOMotorDatabase, patient_id: str
) -> PatientProfileResponse:
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return document_to_profile_response(doc)


async def update_patient_profile(
    db: AsyncIOMotorDatabase, user_id: str, data: PatientProfileUpdate
) -> PatientProfileResponse:
    if data.email is not None:
        other = await patient_repo.get_patient_by_email(db, data.email)
        if other and other.get("user_id") != user_id:
            raise HTTPException(status_code=409, detail="Email already in use")

    if data.patient_slug is not None:
        slug = re.sub(r"[^a-z0-9_]", "", data.patient_slug.lower())
        other = await db.users.find_one(
            {"patient_slug": slug, "role": "patient", "user_id": {"$ne": user_id}}
        )
        if other:
            raise HTTPException(status_code=409, detail="Patient slug already in use")

    doc = await patient_repo.update_patient(db, user_id, data)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return document_to_profile_response(doc)


async def list_all_patients(
    db: AsyncIOMotorDatabase,
    skip: int = 0,
    limit: int = 50,
    *,
    search: str | None = None,
    restrict_to_user_id: str | None = None,
) -> PatientListResponse:
    if restrict_to_user_id is not None:
        doc = await patient_repo.get_patient(db, restrict_to_user_id)
        if doc is None:
            return PatientListResponse(
                items=[], total=0, skip=skip, limit=limit
            )
        prof = document_to_profile_response(doc)
        if search and search.strip():
            q = search.strip().lower()
            hay = " ".join(
                [
                    (prof.first_name or ""),
                    (prof.last_name or ""),
                    prof.email,
                    prof.patient_slug or "",
                ]
            ).lower()
            if q not in hay:
                return PatientListResponse(
                    items=[], total=0, skip=skip, limit=limit
                )
        return PatientListResponse(
            items=[prof],
            total=1,
            skip=skip,
            limit=limit,
        )
    items, total = await patient_repo.list_patients(
        db, skip=skip, limit=limit, search=search
    )
    return PatientListResponse(
        items=[document_to_profile_response(d) for d in items],
        total=total,
        skip=skip,
        limit=limit,
    )


async def list_patients_for_connected_doctor(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
) -> PatientListResponse:
    """Active connections only, same ordering as the doctor portal patient list."""
    conns = await connection_repo.list_connected_patients(db, doctor_id)
    docs: list[dict] = []
    for c in conns:
        pdoc = await patient_repo.get_patient(db, c["patient_id"])
        if pdoc:
            docs.append(pdoc)
    if search and search.strip():
        q = search.strip().lower()
        filtered: list[dict] = []
        for doc in docs:
            prof = document_to_profile_response(doc)
            hay = " ".join(
                [
                    (prof.first_name or ""),
                    (prof.last_name or ""),
                    prof.email,
                    prof.patient_slug or "",
                ]
            ).lower()
            if q in hay:
                filtered.append(doc)
        docs = filtered
    total = len(docs)
    page = docs[skip : skip + limit]
    return PatientListResponse(
        items=[document_to_profile_response(d) for d in page],
        total=total,
        skip=skip,
        limit=limit,
    )
