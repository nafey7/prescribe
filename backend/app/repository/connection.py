from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.enums import ConnectionStatus
from app.utils import utcnow

_PROJECTION = {"_id": 0}


async def create_connection(
    db: AsyncIOMotorDatabase,
    *,
    doctor_id: str,
    patient_id: str,
    initiated_by: str,
) -> dict:
    now = utcnow()
    doc = {
        "connection_id": str(uuid4()),
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "status": ConnectionStatus.PENDING.value,
        "initiated_by": initiated_by,
        "initiated_at": now,
        "responded_at": None,
        "removed_at": None,
        "removed_by": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.connections.insert_one(doc)
    return doc


async def get_connection(
    db: AsyncIOMotorDatabase, connection_id: str
) -> dict | None:
    return await db.connections.find_one(
        {"connection_id": connection_id}, _PROJECTION
    )


async def get_active_connection(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> dict | None:
    return await db.connections.find_one(
        {
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "status": ConnectionStatus.ACTIVE.value,
        },
        _PROJECTION,
    )


async def get_pending_or_active(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> dict | None:
    return await db.connections.find_one(
        {
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "status": {"$in": [ConnectionStatus.PENDING.value, ConnectionStatus.ACTIVE.value]},
        },
        _PROJECTION,
    )


async def update_connection_status(
    db: AsyncIOMotorDatabase,
    connection_id: str,
    status: str,
    extra_fields: dict | None = None,
) -> dict | None:
    merged = {
        "status": status,
        "updated_at": utcnow(),
        **(extra_fields or {}),
    }
    result = await db.connections.find_one_and_update(
        {"connection_id": connection_id},
        {"$set": merged},
        return_document=ReturnDocument.AFTER,
        projection=_PROJECTION,
    )
    return result


async def list_connections_for_doctor(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    status_filter: str | None,
    skip: int,
    limit: int,
    initiated_by: str | None = None,
) -> tuple[list[dict], int]:
    query: dict = {"doctor_id": doctor_id}
    if status_filter:
        query["status"] = status_filter
    if initiated_by is not None:
        query["initiated_by"] = initiated_by
    total = await db.connections.count_documents(query)
    cursor = (
        db.connections.find(query, _PROJECTION)
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    return items, total


async def list_connections_for_patient(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    status_filter: str | None,
    skip: int,
    limit: int,
) -> tuple[list[dict], int]:
    query: dict = {"patient_id": patient_id}
    if status_filter:
        query["status"] = status_filter
    total = await db.connections.count_documents(query)
    cursor = (
        db.connections.find(query, _PROJECTION)
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    return items, total


async def list_connected_patients(
    db: AsyncIOMotorDatabase, doctor_id: str
) -> list[dict]:
    cursor = db.connections.find(
        {
            "doctor_id": doctor_id,
            "status": ConnectionStatus.ACTIVE.value,
        },
        _PROJECTION,
    ).sort("responded_at", -1)
    return await cursor.to_list(length=500)


async def is_connected(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> bool:
    n = await db.connections.count_documents(
        {
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "status": ConnectionStatus.ACTIVE.value,
        }
    )
    return n > 0


async def count_connections(
    db: AsyncIOMotorDatabase,
    *,
    user_id: str,
    role: str,
    status: str | None,
    initiated_by: str | None = None,
) -> int:
    field = "doctor_id" if role == "doctor" else "patient_id"
    query: dict = {field: user_id}
    if status:
        query["status"] = status
    if initiated_by is not None:
        query["initiated_by"] = initiated_by
    return await db.connections.count_documents(query)
