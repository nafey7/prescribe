from fastapi import APIRouter, Depends, Header, HTTPException, Response

from app.api.dependencies import (
    auth_bypass_allowed,
    primary_patient_connection_id,
    resolve_actor_user,
)
from app.database.connection import get_database
from app.repository import connection as connection_repo
from app.schemas.connection import ConnectionRequest, ConnectionResponse
from app.schemas.enums import ConnectionStatus, UserRole
from app.service import connection as connection_service
from app.service.auth import CurrentUser

router = APIRouter()


async def _connection_request_headers(
    db,
    actor: CurrentUser | None,
    body: ConnectionRequest,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> tuple[str | None, str | None]:
    if actor is None:
        if not auth_bypass_allowed():
            raise HTTPException(status_code=401, detail="Authentication required")
        return x_doctor_id, x_patient_id
    if body.initiated_by == "patient":
        if actor.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=403,
                detail="Only a patient can initiate this request as patient",
            )
        pid = await primary_patient_connection_id(db, actor.user_id)
        if pid != body.patient_id:
            raise HTTPException(
                status_code=403,
                detail="Patient identity does not match request",
            )
        return x_doctor_id, pid
    if body.initiated_by == "doctor":
        if actor.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=403,
                detail="Only a doctor can initiate this request as doctor",
            )
        if actor.user_id != body.doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Doctor identity does not match request",
            )
        return actor.user_id, x_patient_id
    raise HTTPException(status_code=422, detail="Invalid initiated_by")


async def _accept_reject_headers(
    db,
    actor: CurrentUser | None,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> tuple[str | None, str | None]:
    if actor is None:
        if not auth_bypass_allowed():
            raise HTTPException(status_code=401, detail="Authentication required")
        return x_doctor_id, x_patient_id
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
        if actor.role != UserRole.DOCTOR or actor.user_id != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )
        return actor.user_id, x_patient_id
    if initiated_by == "doctor":
        if actor.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )
        pid = await primary_patient_connection_id(db, actor.user_id)
        if pid != patient_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject this request",
            )
        return x_doctor_id, pid
    raise HTTPException(status_code=400, detail="Invalid connection state")


async def _cancel_headers(
    db,
    actor: CurrentUser | None,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> tuple[str | None, str | None]:
    if actor is None:
        if not auth_bypass_allowed():
            raise HTTPException(status_code=401, detail="Authentication required")
        return x_doctor_id, x_patient_id
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
        if actor.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=403,
                detail="Only the sender can cancel this request",
            )
        pid = await primary_patient_connection_id(db, actor.user_id)
        if pid != patient_id:
            raise HTTPException(
                status_code=403,
                detail="Only the sender can cancel this request",
            )
        return x_doctor_id, pid
    if initiated_by == "doctor":
        if actor.role != UserRole.DOCTOR or actor.user_id != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Only the sender can cancel this request",
            )
        return doctor_id, x_patient_id
    raise HTTPException(status_code=400, detail="Invalid connection state")


async def _remove_headers(
    db,
    actor: CurrentUser | None,
    connection_id: str,
    x_doctor_id: str | None,
    x_patient_id: str | None,
) -> tuple[str | None, str | None]:
    if actor is None:
        if not auth_bypass_allowed():
            raise HTTPException(status_code=401, detail="Authentication required")
        return x_doctor_id, x_patient_id
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
    if actor.role == UserRole.DOCTOR and actor.user_id == doctor_id:
        return actor.user_id, x_patient_id
    if actor.role == UserRole.PATIENT:
        pid = await primary_patient_connection_id(db, actor.user_id)
        if pid == patient_id:
            return x_doctor_id, pid
    raise HTTPException(
        status_code=403,
        detail="You are not part of this connection",
    )


@router.post("/request", response_model=ConnectionResponse, status_code=201)
async def send_connection_request(
    body: ConnectionRequest,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ConnectionResponse:
    db = get_database()
    eff_doc, eff_pat = await _connection_request_headers(
        db, actor, body, x_doctor_id, x_patient_id
    )
    return await connection_service.send_connection_request(
        db,
        doctor_id=body.doctor_id,
        patient_id=body.patient_id,
        initiated_by=body.initiated_by,
        x_doctor_id=eff_doc,
        x_patient_id=eff_pat,
    )


@router.put("/{connection_id}/accept", response_model=ConnectionResponse)
async def accept_connection(
    connection_id: str,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ConnectionResponse:
    db = get_database()
    eff_doc, eff_pat = await _accept_reject_headers(
        db, actor, connection_id, x_doctor_id, x_patient_id
    )
    return await connection_service.accept_connection(
        db,
        connection_id=connection_id,
        x_doctor_id=eff_doc,
        x_patient_id=eff_pat,
    )


@router.put("/{connection_id}/reject", response_model=ConnectionResponse)
async def reject_connection(
    connection_id: str,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ConnectionResponse:
    db = get_database()
    eff_doc, eff_pat = await _accept_reject_headers(
        db, actor, connection_id, x_doctor_id, x_patient_id
    )
    return await connection_service.reject_connection(
        db,
        connection_id=connection_id,
        x_doctor_id=eff_doc,
        x_patient_id=eff_pat,
    )


@router.delete("/{connection_id}", status_code=204)
async def cancel_or_remove_connection(
    connection_id: str,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> Response:
    db = get_database()
    doc = await connection_repo.get_connection(db, connection_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if doc["status"] == ConnectionStatus.PENDING.value:
        eff_doc, eff_pat = await _cancel_headers(
            db, actor, connection_id, x_doctor_id, x_patient_id
        )
        await connection_service.cancel_or_remove(
            db,
            connection_id=connection_id,
            x_doctor_id=eff_doc,
            x_patient_id=eff_pat,
        )
        return Response(status_code=204)
    if doc["status"] == ConnectionStatus.ACTIVE.value:
        eff_doc, eff_pat = await _remove_headers(
            db, actor, connection_id, x_doctor_id, x_patient_id
        )
        await connection_service.cancel_or_remove(
            db,
            connection_id=connection_id,
            x_doctor_id=eff_doc,
            x_patient_id=eff_pat,
        )
        return Response(status_code=204)
    raise HTTPException(
        status_code=400,
        detail="Connection cannot be cancelled or removed in its current status",
    )
