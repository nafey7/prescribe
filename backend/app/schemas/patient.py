from datetime import datetime

from pydantic import BaseModel, Field


class Address(BaseModel):
    street: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""


class EmergencyContact(BaseModel):
    name: str = ""
    relationship: str = ""
    phone: str = ""


class Allergy(BaseModel):
    substance: str
    reaction: str = ""
    documented_date: str = ""


class Condition(BaseModel):
    name: str
    diagnosed_year: int | None = None
    status: str = "active"
    notes: str | None = ""


class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    since: str | None = None


class FamilyHistoryEntry(BaseModel):
    relation: str
    condition: str


class Lifestyle(BaseModel):
    smoking_status: str = "unknown"
    smoking_notes: str = ""
    alcohol: str = ""
    exercise: str = ""
    diet_notes: str = ""


class PatientProfileCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[\w\.\-]+@[\w\.\-]+\.\w+$")
    patient_slug: str | None = Field(
        default=None,
        max_length=120,
        description="Stable id for chat + markdown file linkage; auto-generated if omitted",
    )
    date_of_birth: str | None = None
    sex: str | None = None
    blood_type: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    phone: str | None = None
    address: Address | None = None
    emergency_contact: EmergencyContact | None = None
    allergies: list[Allergy] = []
    conditions: list[Condition] = []
    medications: list[Medication] = []
    family_history: list[FamilyHistoryEntry] = []
    lifestyle: Lifestyle | None = None


class PatientProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    patient_slug: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    blood_type: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    phone: str | None = None
    address: Address | None = None
    emergency_contact: EmergencyContact | None = None
    allergies: list[Allergy] | None = None
    conditions: list[Condition] | None = None
    medications: list[Medication] | None = None
    family_history: list[FamilyHistoryEntry] | None = None
    lifestyle: Lifestyle | None = None


class PatientProfileResponse(BaseModel):
    user_id: str
    patient_slug: str
    email: str
    first_name: str
    last_name: str
    date_of_birth: str | None
    sex: str | None
    blood_type: str | None
    weight_kg: float | None
    height_cm: float | None
    phone: str | None
    address: Address | None
    emergency_contact: EmergencyContact | None
    allergies: list[Allergy]
    conditions: list[Condition]
    medications: list[Medication]
    family_history: list[FamilyHistoryEntry]
    lifestyle: Lifestyle | None
    created_at: str
    updated_at: str


class PatientListResponse(BaseModel):
    items: list[PatientProfileResponse]
    total: int
    skip: int
    limit: int


def _dt_to_iso(value: datetime | str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def document_to_profile_response(doc: dict) -> PatientProfileResponse:
    profile = doc.get("patient_profile") or {}
    addr = profile.get("address") or {}
    ec = profile.get("emergency_contact") or {}
    lifestyle_raw = profile.get("lifestyle")

    lifestyle = None
    if lifestyle_raw:
        lifestyle = Lifestyle.model_validate(lifestyle_raw)

    allergies = [Allergy.model_validate(a) for a in profile.get("allergies") or []]
    conditions = [Condition.model_validate(c) for c in profile.get("conditions") or []]
    medications = [Medication.model_validate(m) for m in profile.get("medications") or []]
    family_history = [
        FamilyHistoryEntry.model_validate(f) for f in profile.get("family_history") or []
    ]

    address = Address.model_validate(addr) if addr else None
    emergency_contact = EmergencyContact.model_validate(ec) if ec else None

    return PatientProfileResponse(
        user_id=doc["user_id"],
        patient_slug=doc.get("patient_slug") or "",
        email=doc.get("email") or "",
        first_name=profile.get("first_name") or "",
        last_name=profile.get("last_name") or "",
        date_of_birth=profile.get("date_of_birth"),
        sex=profile.get("sex"),
        blood_type=profile.get("blood_type"),
        weight_kg=profile.get("weight_kg"),
        height_cm=profile.get("height_cm"),
        phone=profile.get("phone"),
        address=address,
        emergency_contact=emergency_contact,
        allergies=allergies,
        conditions=conditions,
        medications=medications,
        family_history=family_history,
        lifestyle=lifestyle,
        created_at=_dt_to_iso(doc.get("created_at")),
        updated_at=_dt_to_iso(doc.get("updated_at")),
    )
