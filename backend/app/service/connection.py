from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import connection as connection_repo
from app.repository import doctor as doctor_repo
from app.repository import patient as patient_repo
from app.utils import utcnow
from app.schemas.connection import (
    ConnectionListResponse,
    ConnectionResponse,
    connection_document_to_response,
)
from app.schemas.enums import ConnectionStatus


def _doctor_display_name(doc: dict) -> str:
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


def _patient_display_name(doc: dict) -> str:
    prof = doc.get("patient_profile") or {}
    fn = (prof.get("first_name") or "").strip()
    ln = (prof.get("last_name") or "").strip()
    if fn or ln:
        return " ".join(p for p in (fn, ln) if p).strip()
    return doc.get("email") or "Patient"


async def _enrich_connection(
    db: AsyncIOMotorDatabase, doc: dict
) -> ConnectionResponse:
    base = connection_document_to_response(doc)
    doctor_name: str | None = None
    patient_name: str | None = None
    ddoc = await doctor_repo.get_doctor(db, doc["doctor_id"])
    if ddoc:
        doctor_name = _doctor_display_name(ddoc)
    pdoc = await patient_repo.get_patient(db, doc["patient_id"])
    if pdoc:
        patient_name = _patient_display_name(pdoc)
    return base.model_copy(
        update={"doctor_name": doctor_name, "patient_name": patient_name}
    )


async def verify_connection(
    db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str
) -> None:
    connected = await connection_repo.is_connected(db, doctor_id, patient_id)
    if not connected:
        raise HTTPException(
            status_code=403,
            detail="No active connection with this patient",
        )


async def send_connection_request(
    db: AsyncIOMotorDatabase,
    *,
    doctor_id: str,
    patient_id: str,
    initiated_by: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> ConnectionResponse:
    if initiated_by == "patient":
        if not x_patient_id or x_patient_id != patient_id:
            raise HTTPException(
                status_code=403,
                detail="X-Patient-Id must match the patient sending this request",
            )
    elif initiated_by == "doctor":
        if not x_doctor_id or x_doctor_id != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="X-Doctor-Id must match the doctor sending this request",
            )

    if doctor_id == patient_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot create a connection with yourself",
        )

    if not await doctor_repo.doctor_exists(db, doctor_id):
        raise HTTPException(status_code=404, detail="Doctor not found")
    if not await patient_repo.patient_exists(db, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")

    if initiated_by == "patient":
        pdoc = await patient_repo.get_patient(db, patient_id)
        if pdoc is None:
            raise HTTPException(status_code=404, detail="Patient not found")
    elif initiated_by == "doctor":
        ddoc = await doctor_repo.get_doctor(db, doctor_id)
        if ddoc is None:
            raise HTTPException(status_code=404, detail="Doctor not found")
    else:
        raise HTTPException(status_code=422, detail="Invalid initiated_by")

    existing = await connection_repo.get_pending_or_active(db, doctor_id, patient_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A connection already exists between this doctor and patient",
        )

    doc = await connection_repo.create_connection(
        db,
        doctor_id=doctor_id,
        patient_id=patient_id,
        initiated_by=initiated_by,
    )
    return await _enrich_connection(db, doc)


async def accept_connection(
    db: AsyncIOMotorDatabase,
    *,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> ConnectionResponse:
    doc = await connection_repo.get_connection(db, connection_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if doc["status"] != ConnectionStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail="Connection is not in pending status",
        )

    initiated_by = doc["initiated_by"]
    doctor_id = doc["doctor_id"]
    patient_id = doc["patient_id"]

    if initiated_by == "patient":
        if not x_doctor_id or x_doctor_id != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )
    elif initiated_by == "doctor":
        if not x_patient_id or x_patient_id != patient_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid connection state")

    updated = await connection_repo.update_connection_status(
        db,
        connection_id,
        ConnectionStatus.ACTIVE.value,
        extra_fields={"responded_at": utcnow()},
    )
    assert updated is not None
    return await _enrich_connection(db, updated)


async def reject_connection(
    db: AsyncIOMotorDatabase,
    *,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> ConnectionResponse:
    doc = await connection_repo.get_connection(db, connection_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if doc["status"] != ConnectionStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail="Connection is not in pending status",
        )

    initiated_by = doc["initiated_by"]
    doctor_id = doc["doctor_id"]
    patient_id = doc["patient_id"]

    if initiated_by == "patient":
        if not x_doctor_id or x_doctor_id != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )
    elif initiated_by == "doctor":
        if not x_patient_id or x_patient_id != patient_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )

    updated = await connection_repo.update_connection_status(
        db,
        connection_id,
        ConnectionStatus.REJECTED.value,
        extra_fields={"responded_at": utcnow()},
    )
    assert updated is not None
    return await _enrich_connection(db, updated)


async def cancel_connection(
    db: AsyncIOMotorDatabase,
    *,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> ConnectionResponse:
    doc = await connection_repo.get_connection(db, connection_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if doc["status"] != ConnectionStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail="Connection is not in pending status",
        )

    initiated_by = doc["initiated_by"]
    doctor_id = doc["doctor_id"]
    patient_id = doc["patient_id"]

    if initiated_by == "patient":
        if not x_patient_id or x_patient_id != patient_id:
            raise HTTPException(
                status_code=403,
                detail="Only the sender can cancel this request",
            )
    elif initiated_by == "doctor":
        if not x_doctor_id or x_doctor_id != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Only the sender can cancel this request",
            )

    updated = await connection_repo.update_connection_status(
        db,
        connection_id,
        ConnectionStatus.CANCELLED.value,
        extra_fields={"responded_at": utcnow()},
    )
    assert updated is not None
    return await _enrich_connection(db, updated)


async def remove_connection(
    db: AsyncIOMotorDatabase,
    *,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> ConnectionResponse:
    doc = await connection_repo.get_connection(db, connection_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if doc["status"] != ConnectionStatus.ACTIVE.value:
        raise HTTPException(
            status_code=400,
            detail="Connection is not active",
        )

    doctor_id = doc["doctor_id"]
    patient_id = doc["patient_id"]
    is_doc = bool(x_doctor_id) and x_doctor_id == doctor_id
    is_pat = bool(x_patient_id) and x_patient_id == patient_id
    if not is_doc and not is_pat:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this connection",
        )
    # If both headers identify this connection (dev may send both), prefer doctor for audit.
    removed_by = "doctor" if is_doc else "patient"

    now = utcnow()
    updated = await connection_repo.update_connection_status(
        db,
        connection_id,
        ConnectionStatus.REMOVED.value,
        extra_fields={
            "responded_at": doc.get("responded_at"),
            "removed_at": now,
            "removed_by": removed_by,
        },
    )
    assert updated is not None
    return await _enrich_connection(db, updated)


async def cancel_or_remove(
    db: AsyncIOMotorDatabase,
    *,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> None:
    doc = await connection_repo.get_connection(db, connection_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if doc["status"] == ConnectionStatus.PENDING.value:
        await cancel_connection(
            db,
            connection_id=connection_id,
            x_doctor_id=x_doctor_id,
            x_patient_id=x_patient_id,
        )
        return
    if doc["status"] == ConnectionStatus.ACTIVE.value:
        await remove_connection(
            db,
            connection_id=connection_id,
            x_doctor_id=x_doctor_id,
            x_patient_id=x_patient_id,
        )
        return
    raise HTTPException(
        status_code=400,
        detail="Connection cannot be cancelled or removed in its current status",
    )


async def get_doctor_connections(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    status: str | None,
    skip: int,
    limit: int,
) -> ConnectionListResponse:
    if not await doctor_repo.doctor_exists(db, doctor_id):
        raise HTTPException(status_code=404, detail="Doctor not found")
    items, total = await connection_repo.list_connections_for_doctor(
        db, doctor_id, status_filter=status, skip=skip, limit=limit
    )
    enriched = [await _enrich_connection(db, d) for d in items]
    return ConnectionListResponse(
        connections=enriched,
        total=total,
        skip=skip,
        limit=limit,
    )


async def get_patient_connections(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    *,
    status: str | None,
    skip: int,
    limit: int,
) -> ConnectionListResponse:
    resolved = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    uid = resolved["user_id"]
    items, total = await connection_repo.list_connections_for_patient(
        db, uid, status_filter=status, skip=skip, limit=limit
    )
    enriched = [await _enrich_connection(db, d) for d in items]
    return ConnectionListResponse(
        connections=enriched,
        total=total,
        skip=skip,
        limit=limit,
    )
