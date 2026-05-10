from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import PrescriptionStatus
from app.utils import prescription_id, utcnow


class Medication(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""


class PrescriptionDocument(BaseModel):
    """MongoDB document shape for the `prescriptions` collection."""

    prescription_id: str = Field(default_factory=prescription_id)
    patient_id: str
    doctor_id: str
    created_by_user_id: str
    status: PrescriptionStatus = PrescriptionStatus.ACTIVE
    diagnosis_summary: str = ""
    notes: str = ""
    medications: list[Medication] = Field(default_factory=list)
    attachments: list[str] = Field(default_factory=list)
    issued_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PrescriptionCreate(BaseModel):
    """Payload for creating a prescription."""

    patient_id: str
    doctor_id: str
    created_by_user_id: str
    diagnosis_summary: str = ""
    notes: str = ""
    medications: list[Medication] = Field(default_factory=list)


class PrescriptionRead(BaseModel):
    """Response DTO for prescriptions."""

    prescription_id: str
    patient_id: str
    doctor_id: str
    created_by_user_id: str
    status: PrescriptionStatus
    diagnosis_summary: str
    notes: str
    medications: list[Medication]
    attachments: list[str]
    issued_at: datetime
    created_at: datetime
    updated_at: datetime


class PrescriptionSuggestionRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=2000)


class MedicationSuggestion(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""


class PrescriptionSuggestionResponse(BaseModel):
    diagnosis_summary: str = ""
    notes: str = ""
    medications: list[MedicationSuggestion]
