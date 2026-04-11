from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.enums import Gender
from app.utils import patient_id, utcnow


class Address(BaseModel):
    line1: str = ""
    city: str = ""
    country: str = "PK"


class EmergencyContact(BaseModel):
    name: str = ""
    phone: str = ""
    relation: str = ""


class MedicalSummary(BaseModel):
    allergies: list[str] = Field(default_factory=list)
    chronic_conditions: list[str] = Field(default_factory=list)
    notes: str = ""


def _coerce_date_of_birth(v: date | datetime | str | None) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        return date.fromisoformat(v[:10])
    raise TypeError("date_of_birth must be a date, datetime, or ISO date string")


class PatientProfileDocument(BaseModel):
    """MongoDB document shape for the `patient_profiles` collection."""

    patient_id: str = Field(default_factory=patient_id)
    user_id: str
    full_name: str
    date_of_birth: date | None = None
    gender: Gender | None = None
    blood_group: str | None = None
    phone: str | None = None
    address: Address = Field(default_factory=Address)
    emergency_contact: EmergencyContact = Field(default_factory=EmergencyContact)
    medical_summary: MedicalSummary = Field(default_factory=MedicalSummary)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def document_dob(cls, v: date | datetime | str | None) -> date | None:
        return _coerce_date_of_birth(v)


class PatientProfileCreate(BaseModel):
    """Payload for creating a patient profile."""

    user_id: str
    full_name: str
    date_of_birth: date | None = None
    gender: Gender | None = None
    blood_group: str | None = None
    phone: str | None = None
    address: Address | None = None
    emergency_contact: EmergencyContact | None = None
    medical_summary: MedicalSummary | None = None

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def parse_date_of_birth(cls, v: date | str | None) -> date | None:
        if v is None:
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            return date.fromisoformat(v[:10])
        raise TypeError("date_of_birth must be a date or ISO date string (YYYY-MM-DD)")


class PatientProfileRead(BaseModel):
    """Response DTO for patient profiles."""

    patient_id: str
    user_id: str
    full_name: str
    date_of_birth: date | None = None
    gender: Gender | None = None
    blood_group: str | None = None
    phone: str | None = None
    address: Address
    emergency_contact: EmergencyContact
    medical_summary: MedicalSummary
    created_at: datetime
    updated_at: datetime

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def read_dob(cls, v: date | datetime | str | None) -> date | None:
        return _coerce_date_of_birth(v)
