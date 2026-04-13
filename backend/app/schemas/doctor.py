from datetime import datetime

from pydantic import BaseModel, Field

from app.utils import doctor_id, utcnow


class DoctorProfileDocument(BaseModel):
    """MongoDB document shape for the `doctor_profiles` collection."""

    doctor_id: str = Field(default_factory=doctor_id)
    user_id: str
    full_name: str
    specialization: str | None = None
    license_number: str | None = None
    years_of_experience: int | None = None
    clinic_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    accepting_new_patients: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class DoctorProfileCreate(BaseModel):
    """Payload for creating a doctor profile."""

    user_id: str
    full_name: str
    specialization: str | None = None
    license_number: str | None = None
    years_of_experience: int | None = None
    clinic_name: str | None = None
    phone: str | None = None
    bio: str | None = None


class DoctorProfileRead(BaseModel):
    """Response DTO for doctor profiles."""

    doctor_id: str
    user_id: str
    full_name: str
    specialization: str | None = None
    license_number: str | None = None
    years_of_experience: int | None = None
    clinic_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    accepting_new_patients: bool
    created_at: datetime
    updated_at: datetime
