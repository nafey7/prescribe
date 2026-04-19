from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.utils import utcnow


class OfficeAddress(BaseModel):
    street: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""


class Education(BaseModel):
    degree: str
    institution: str
    year: int | None = None


class DoctorProfileCreate(BaseModel):
    """Payload for registering a doctor (`users` + nested `doctor_profile`)."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    title: str = "Dr."
    specialization: str = Field(..., min_length=1, max_length=200)
    sub_specializations: list[str] = Field(default_factory=list)
    license_number: str | None = None
    license_state: str | None = None
    npi_number: str | None = None
    institution: str | None = None
    department: str | None = None
    years_of_experience: int | None = None
    education: list[Education] = Field(default_factory=list)
    phone: str | None = None
    office_address: OfficeAddress | None = None
    accepting_new_patients: bool = True
    bio: str = ""


class DoctorProfileUpdate(BaseModel):
    """Partial update for doctor profile."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    title: str | None = None
    specialization: str | None = Field(None, min_length=1, max_length=200)
    sub_specializations: list[str] | None = None
    license_number: str | None = None
    license_state: str | None = None
    npi_number: str | None = None
    institution: str | None = None
    department: str | None = None
    years_of_experience: int | None = None
    education: list[Education] | None = None
    phone: str | None = None
    office_address: OfficeAddress | None = None
    accepting_new_patients: bool | None = None
    bio: str | None = None


class DoctorProfileResponse(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    title: str
    specialization: str
    sub_specializations: list[str]
    license_number: str | None
    license_state: str | None
    npi_number: str | None
    institution: str | None
    department: str | None
    years_of_experience: int | None
    education: list[Education]
    phone: str | None
    office_address: OfficeAddress | None
    accepting_new_patients: bool
    bio: str
    created_at: datetime
    updated_at: datetime


class DoctorListResponse(BaseModel):
    doctors: list[DoctorProfileResponse]
    total: int
    skip: int
    limit: int


class DoctorInfo(BaseModel):
    """Lightweight doctor info for pickers and dev identity."""

    id: str
    name: str
    specialization: str = ""
    institution: str | None = None


class DoctorPatientListItem(BaseModel):
    """One row in the doctor portal patient list (active connections only)."""

    patient_id: str
    first_name: str
    last_name: str
    age: int | None = None
    sex: str | None = None
    conditions: list[str] = Field(default_factory=list)
    connected_since: str
    last_interaction: str | None = None


class DoctorPatientListResponse(BaseModel):
    patients: list[DoctorPatientListItem]
    total: int
    skip: int
    limit: int


class DashboardStats(BaseModel):
    connected_patients: int
    pending_requests: int
    total_prescriptions: int


class PendingRequestSummary(BaseModel):
    connection_id: str
    patient_id: str
    patient_name: str
    initiated_by: str
    initiated_at: str


class RecentPatientSummary(BaseModel):
    patient_id: str
    first_name: str
    last_name: str
    sex: str | None
    age: int | None
    last_interaction: str | None


class RecentActivityItem(BaseModel):
    type: str  # "chat" | "prescription"
    timestamp: str
    patient_id: str
    patient_name: str
    summary: str


class DoctorDashboardResponse(BaseModel):
    doctor_id: str
    doctor_name: str
    specialization: str
    institution: str | None
    stats: DashboardStats
    pending_requests: list[PendingRequestSummary]
    recent_patients: list[RecentPatientSummary]
    recent_activity: list[RecentActivityItem]


def _legacy_split_display_name(display_name: str) -> tuple[str, str]:
    rest = display_name.replace("Dr.", "").replace("Dr", "").strip()
    parts = rest.split(None, 1)
    if len(parts) >= 2:
        return parts[0].strip(), parts[1].strip()
    if len(parts) == 1:
        return parts[0].strip(), ""
    return "", ""


def document_to_doctor_profile_response(doc: dict) -> DoctorProfileResponse:
    """Map a `users` doctor document to API response."""
    prof = doc.get("doctor_profile") or {}
    first_name = (prof.get("first_name") or "").strip()
    last_name = (prof.get("last_name") or "").strip()
    if not first_name and not last_name:
        dn = (prof.get("display_name") or "").strip()
        if dn:
            first_name, last_name = _legacy_split_display_name(dn)

    title = (prof.get("title") or "Dr.").strip() or "Dr."
    sub = prof.get("sub_specializations")
    if not isinstance(sub, list):
        sub = []

    edu_raw = prof.get("education") or []
    education: list[Education] = []
    for e in edu_raw:
        if isinstance(e, dict) and e.get("degree") and e.get("institution"):
            education.append(
                Education(
                    degree=e["degree"],
                    institution=e["institution"],
                    year=e.get("year"),
                )
            )

    addr = prof.get("office_address")
    office: OfficeAddress | None = None
    if isinstance(addr, dict) and any(str(addr.get(k, "")).strip() for k in ("street", "city", "state", "zip")):
        office = OfficeAddress(
            street=str(addr.get("street") or ""),
            city=str(addr.get("city") or ""),
            state=str(addr.get("state") or ""),
            zip=str(addr.get("zip") or ""),
        )

    created = doc.get("created_at") or utcnow()
    updated = doc.get("updated_at") or created

    return DoctorProfileResponse(
        user_id=doc["user_id"],
        email=doc.get("email") or "",
        first_name=first_name,
        last_name=last_name,
        title=title,
        specialization=(prof.get("specialization") or "").strip(),
        sub_specializations=sub,
        license_number=prof.get("license_number"),
        license_state=prof.get("license_state"),
        npi_number=prof.get("npi_number"),
        institution=prof.get("institution"),
        department=prof.get("department"),
        years_of_experience=prof.get("years_of_experience"),
        education=education,
        phone=prof.get("phone"),
        office_address=office,
        accepting_new_patients=bool(prof.get("accepting_new_patients", True)),
        bio=str(prof.get("bio") or ""),
        created_at=created,
        updated_at=updated,
    )
