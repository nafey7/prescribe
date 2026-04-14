from fastapi import APIRouter, Header, Response

from app.database.connection import get_database
from app.schemas.connection import ConnectionRequest, ConnectionResponse
from app.service import connection as connection_service

router = APIRouter()


@router.post("/request", response_model=ConnectionResponse, status_code=201)
async def send_connection_request(
    body: ConnectionRequest,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
) -> ConnectionResponse:
    db = get_database()
    return await connection_service.send_connection_request(
        db,
        doctor_id=body.doctor_id,
        patient_id=body.patient_id,
        initiated_by=body.initiated_by,
        x_doctor_id=x_doctor_id,
        x_patient_id=x_patient_id,
    )


@router.put("/{connection_id}/accept", response_model=ConnectionResponse)
async def accept_connection(
    connection_id: str,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
) -> ConnectionResponse:
    db = get_database()
    return await connection_service.accept_connection(
        db,
        connection_id=connection_id,
        x_doctor_id=x_doctor_id,
        x_patient_id=x_patient_id,
    )


@router.put("/{connection_id}/reject", response_model=ConnectionResponse)
async def reject_connection(
    connection_id: str,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
) -> ConnectionResponse:
    db = get_database()
    return await connection_service.reject_connection(
        db,
        connection_id=connection_id,
        x_doctor_id=x_doctor_id,
        x_patient_id=x_patient_id,
    )


@router.delete("/{connection_id}", status_code=204)
async def cancel_or_remove_connection(
    connection_id: str,
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
) -> Response:
    db = get_database()
    await connection_service.cancel_or_remove(
        db,
        connection_id=connection_id,
        x_doctor_id=x_doctor_id,
        x_patient_id=x_patient_id,
    )
    return Response(status_code=204)
