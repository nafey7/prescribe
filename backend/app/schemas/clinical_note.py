from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints, model_validator

from app.schemas.enums import ClinicalNoteCorrectionStatus, ClinicalNoteType

ClinicalNoteTitle = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)
]
ClinicalNoteContent = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12000)
]
ClinicalNoteContext = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)
]
CorrectionText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]


class ClinicalNoteGenerateRequest(BaseModel):
    note_type: ClinicalNoteType
    encounter_date: date
    clinician_context: ClinicalNoteContext


class ClinicalNoteDraft(BaseModel):
    title: ClinicalNoteTitle
    content: ClinicalNoteContent


class ClinicalNoteCreate(BaseModel):
    note_type: ClinicalNoteType
    title: ClinicalNoteTitle
    content: ClinicalNoteContent
    encounter_date: date


class ClinicalNoteUpdate(BaseModel):
    title: ClinicalNoteTitle | None = None
    content: ClinicalNoteContent | None = None

    @model_validator(mode="after")
    def require_change(self):
        if self.title is None and self.content is None:
            raise ValueError("At least one field must be provided")
        return self


class ClinicalNoteCorrectionCreate(BaseModel):
    comment: CorrectionText


class ClinicalNoteCorrectionResolve(BaseModel):
    resolution_note: CorrectionText


class ClinicalNoteCorrectionResponse(BaseModel):
    correction_id: str
    note_id: str
    patient_id: str
    doctor_id: str
    comment: str
    status: ClinicalNoteCorrectionStatus
    created_at: datetime
    resolved_at: datetime | None = None
    resolution_note: str | None = None


class ClinicalNoteResponse(BaseModel):
    note_id: str
    patient_id: str
    doctor_id: str
    doctor_display_name: str | None = None
    note_type: ClinicalNoteType
    title: str
    content: str
    encounter_date: date
    published_at: datetime
    updated_at: datetime
    correction_request: ClinicalNoteCorrectionResponse | None = None


class ClinicalNoteListResponse(BaseModel):
    notes: list[ClinicalNoteResponse]
    total: int
    skip: int
    limit: int
