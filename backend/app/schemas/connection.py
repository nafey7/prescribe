from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConnectionRequest(BaseModel):
    doctor_id: str
    patient_id: str
    initiated_by: Literal["patient", "doctor"]


class ConnectionResponse(BaseModel):
    connection_id: str
    doctor_id: str
    patient_id: str
    status: str
    initiated_by: str
    initiated_at: datetime
    responded_at: datetime | None = None
    removed_at: datetime | None = None
    removed_by: str | None = None
    doctor_name: str | None = None
    patient_name: str | None = None


class ConnectionListResponse(BaseModel):
    connections: list[ConnectionResponse]
    total: int
    skip: int
    limit: int


class ConnectedPatientSummary(BaseModel):
    """Active connection + patient display fields for doctor portal."""

    user_id: str
    patient_slug: str
    first_name: str
    last_name: str
    sex: str | None = None
    date_of_birth: str | None = None
    email: str | None = None
    connected_at: datetime | None = Field(
        default=None,
        description="When the connection became active (accept time)",
    )


def connection_document_to_response(doc: dict) -> ConnectionResponse:
    return ConnectionResponse(
        connection_id=doc["connection_id"],
        doctor_id=doc["doctor_id"],
        patient_id=doc["patient_id"],
        status=doc["status"],
        initiated_by=doc["initiated_by"],
        initiated_at=doc["initiated_at"],
        responded_at=doc.get("responded_at"),
        removed_at=doc.get("removed_at"),
        removed_by=doc.get("removed_by"),
    )


__all__ = [
    "ConnectedPatientSummary",
    "ConnectionListResponse",
    "ConnectionRequest",
    "ConnectionResponse",
    "connection_document_to_response",
]
