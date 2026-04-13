from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import LinkRequestedBy, LinkStatus
from app.utils import link_id, utcnow


class DoctorPatientLinkDocument(BaseModel):
    """MongoDB document shape for the `doctor_patient_links` collection."""

    link_id: str = Field(default_factory=link_id)
    patient_id: str
    doctor_id: str
    status: LinkStatus = LinkStatus.PENDING_PATIENT_REQUEST
    requested_by: LinkRequestedBy = LinkRequestedBy.PATIENT
    requested_at: datetime = Field(default_factory=utcnow)
    responded_at: datetime | None = None
    accepted_at: datetime | None = None
    rejected_at: datetime | None = None
    ended_at: datetime | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class DoctorPatientLinkCreate(BaseModel):
    """Payload for creating a doctor-patient link request."""

    patient_id: str
    doctor_id: str
    requested_by: LinkRequestedBy = LinkRequestedBy.PATIENT
    notes: str | None = None


class DoctorPatientLinkRead(BaseModel):
    """Response DTO for doctor-patient links."""

    link_id: str
    patient_id: str
    doctor_id: str
    status: LinkStatus
    requested_by: LinkRequestedBy
    requested_at: datetime
    responded_at: datetime | None = None
    accepted_at: datetime | None = None
    rejected_at: datetime | None = None
    ended_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
