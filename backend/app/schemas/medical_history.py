from pydantic import BaseModel, Field

from app.schemas.patient import Allergy, Condition, FamilyHistoryEntry, Lifestyle, Medication


class LabResult(BaseModel):
    name: str
    value: str
    status: str = "normal"
    reference_range: str | None = None


class LabReport(BaseModel):
    date: str
    results: list[LabResult]


class MedicalEvent(BaseModel):
    year: int
    description: str


class PatientSummary(BaseModel):
    first_name: str
    last_name: str
    age: int | None = None
    sex: str | None = None
    blood_type: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None


class DocumentSummary(BaseModel):
    document_id: str
    filename: str
    category: str = ""
    uploaded_at: str


class MedicalHistoryResponse(BaseModel):
    patient_id: str
    summary: PatientSummary
    conditions: list[Condition]
    allergies: list[Allergy]
    medications: list[Medication]
    lab_reports: list[LabReport]
    medical_events: list[MedicalEvent]
    family_history: list[FamilyHistoryEntry]
    lifestyle: Lifestyle | None = None
    recent_documents: list[DocumentSummary] = Field(default_factory=list)
