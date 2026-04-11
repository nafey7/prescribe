from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import DocumentSource, DocumentType, DocumentVisibility
from app.utils import document_id, utcnow


class PatientDocumentDocument(BaseModel):
    """MongoDB document shape for the `patient_documents` collection."""

    document_id: str = Field(default_factory=document_id)
    patient_id: str
    uploaded_by_user_id: str
    document_type: DocumentType = DocumentType.OTHER
    title: str = ""
    description: str = ""
    file_name: str = ""
    storage_key: str = ""
    mime_type: str = ""
    file_size_bytes: int = 0
    visibility: DocumentVisibility = DocumentVisibility.LINKED_DOCTORS
    source: DocumentSource = DocumentSource.PATIENT_UPLOAD
    uploaded_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PatientDocumentCreate(BaseModel):
    """Payload for creating a patient document record."""

    patient_id: str
    uploaded_by_user_id: str
    document_type: DocumentType = DocumentType.OTHER
    title: str = ""
    description: str = ""
    file_name: str = ""
    storage_key: str = ""
    mime_type: str = ""
    file_size_bytes: int = 0
    visibility: DocumentVisibility = DocumentVisibility.LINKED_DOCTORS
    source: DocumentSource = DocumentSource.PATIENT_UPLOAD


class PatientDocumentRead(BaseModel):
    """Response DTO for patient documents."""

    document_id: str
    patient_id: str
    uploaded_by_user_id: str
    document_type: DocumentType
    title: str
    description: str
    file_name: str
    storage_key: str
    mime_type: str
    file_size_bytes: int
    visibility: DocumentVisibility
    source: DocumentSource
    uploaded_at: datetime
    created_at: datetime
    updated_at: datetime
