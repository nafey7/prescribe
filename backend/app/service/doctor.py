from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import doctor as doctor_repo
from app.repository import users as users_repo
from app.schemas.doctor import (
    DoctorInfo,
    DoctorListResponse,
    DoctorProfileCreate,
    DoctorProfileResponse,
    DoctorProfileUpdate,
    OfficeAddress,
    document_to_doctor_profile_response,
)


def _display_name_from_doc(doc: dict) -> str:
    prof = doc.get("doctor_profile") or {}
    title = (prof.get("title") or "Dr.").strip()
    fn = (prof.get("first_name") or "").strip()
    ln = (prof.get("last_name") or "").strip()
    if fn or ln:
        return " ".join(p for p in (title, fn, ln) if p).strip()
    dn = (prof.get("display_name") or "").strip()
    if dn:
        return dn
    return doc.get("email") or "Doctor"


def user_doc_to_doctor_info(doc: dict) -> DoctorInfo:
    prof = doc.get("doctor_profile") or {}
    return DoctorInfo(
        id=doc["user_id"],
        name=_display_name_from_doc(doc),
        specialization=(prof.get("specialization") or "").strip(),
        institution=prof.get("institution"),
    )


async def register_doctor(
    db: AsyncIOMotorDatabase, data: DoctorProfileCreate
) -> DoctorProfileResponse:
    existing = await users_repo.get_user_by_email(db, data.email.lower().strip())
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )
    doc = await doctor_repo.create_doctor(db, data)
    return document_to_doctor_profile_response(doc)


async def get_doctor_profile(
    db: AsyncIOMotorDatabase, user_id: str
) -> DoctorProfileResponse:
    doc = await doctor_repo.get_doctor(db, user_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return document_to_doctor_profile_response(doc)


def _merge_doctor_profile(
    prof: dict, data: DoctorProfileUpdate
) -> tuple[dict, str | None]:
    """Returns (merged doctor_profile dict, new email or None)."""
    patch = data.model_dump(exclude_unset=True)
    email = patch.pop("email", None)
    if email is not None:
        email = str(email).lower().strip()
    out = {**prof}
    for key, val in patch.items():
        if val is None:
            continue
        if key == "office_address":
            oa = OfficeAddress.model_validate(val)
            merged_addr = {**(out.get("office_address") or {}), **oa.model_dump()}
            out["office_address"] = merged_addr
        elif key == "education":
            out["education"] = [dict(e) for e in val]
        elif key == "sub_specializations":
            out["sub_specializations"] = list(val)
        else:
            out[key] = val
    return out, email


async def update_doctor_profile(
    db: AsyncIOMotorDatabase, user_id: str, data: DoctorProfileUpdate
) -> DoctorProfileResponse:
    doc = await doctor_repo.get_doctor(db, user_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    prof = dict(doc.get("doctor_profile") or {})
    merged_prof, new_email = _merge_doctor_profile(prof, data)

    if new_email is not None:
        other = await users_repo.get_user_by_email(db, new_email)
        if other and other.get("user_id") != user_id:
            raise HTTPException(status_code=409, detail="Email already in use")

    updated = await doctor_repo.update_doctor(db, user_id, merged_prof, new_email)
    if updated is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return document_to_doctor_profile_response(updated)


async def list_all_doctors(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
    *,
    search: str | None = None,
) -> DoctorListResponse:
    total = await doctor_repo.count_doctors(db, search=search)
    docs = await doctor_repo.list_doctors(
        db, skip=skip, limit=limit, search=search
    )
    return DoctorListResponse(
        doctors=[document_to_doctor_profile_response(d) for d in docs],
        total=total,
        skip=skip,
        limit=limit,
    )


async def list_doctors_for_dev(db: AsyncIOMotorDatabase) -> list[DoctorInfo]:
    docs = await doctor_repo.list_doctors(db, skip=0, limit=200)
    return [user_doc_to_doctor_info(d) for d in docs]
