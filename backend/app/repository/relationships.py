from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.enums import LinkRequestedBy, LinkStatus
from app.schemas.relationship import DoctorPatientLinkCreate, DoctorPatientLinkDocument
from app.utils import utcnow


async def create_link(
    db: AsyncIOMotorDatabase, payload: DoctorPatientLinkCreate
) -> dict:
    initial_status = (
        LinkStatus.PENDING_PATIENT_REQUEST
        if payload.requested_by == LinkRequestedBy.PATIENT
        else LinkStatus.PENDING_DOCTOR_INVITE
    )
    doc = DoctorPatientLinkDocument(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        status=initial_status,
        requested_by=payload.requested_by,
        notes=payload.notes,
    )
    data = doc.model_dump()
    await db.doctor_patient_links.insert_one(data)
    data.pop("_id", None)
    return data


async def get_link_by_id(
    db: AsyncIOMotorDatabase, link_id: str
) -> dict | None:
    return await db.doctor_patient_links.find_one({"link_id": link_id}, {"_id": 0})


async def get_active_link(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> dict | None:
    return await db.doctor_patient_links.find_one(
        {
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "status": LinkStatus.ACTIVE,
        },
        {"_id": 0},
    )


async def list_links_for_patient(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    status: LinkStatus | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {"patient_id": patient_id}
    if status is not None:
        query["status"] = status
    cursor = (
        db.doctor_patient_links.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def list_links_for_doctor(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    status: LinkStatus | None = None,
    limit: int = 50,
) -> list[dict]:
    query: dict = {"doctor_id": doctor_id}
    if status is not None:
        query["status"] = status
    cursor = (
        db.doctor_patient_links.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def accept_link(
    db: AsyncIOMotorDatabase, link_id: str
) -> dict | None:
    now = utcnow()
    return await db.doctor_patient_links.find_one_and_update(
        {
            "link_id": link_id,
            "status": {"$in": [
                LinkStatus.PENDING_PATIENT_REQUEST,
                LinkStatus.PENDING_DOCTOR_INVITE,
            ]},
        },
        {
            "$set": {
                "status": LinkStatus.ACTIVE,
                "responded_at": now,
                "accepted_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )


async def reject_link(
    db: AsyncIOMotorDatabase, link_id: str
) -> dict | None:
    now = utcnow()
    return await db.doctor_patient_links.find_one_and_update(
        {
            "link_id": link_id,
            "status": {"$in": [
                LinkStatus.PENDING_PATIENT_REQUEST,
                LinkStatus.PENDING_DOCTOR_INVITE,
            ]},
        },
        {
            "$set": {
                "status": LinkStatus.REJECTED,
                "responded_at": now,
                "rejected_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )


async def end_link(
    db: AsyncIOMotorDatabase, link_id: str
) -> dict | None:
    now = utcnow()
    return await db.doctor_patient_links.find_one_and_update(
        {"link_id": link_id, "status": LinkStatus.ACTIVE},
        {
            "$set": {
                "status": LinkStatus.ENDED,
                "ended_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
