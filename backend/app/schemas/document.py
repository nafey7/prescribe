from pydantic import BaseModel

DOCUMENT_CATEGORIES = frozenset(
    {
        "lab_result",
        "imaging",
        "prescription",
        "clinical_note",
        "insurance",
        "other",
    }
)


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    content_type: str
    file_size_bytes: int
    category: str
    description: str
    uploaded_at: str


class DocumentMetadata(BaseModel):
    document_id: str
    patient_id: str
    filename: str
    content_type: str
    file_size_bytes: int
    category: str
    description: str
    tags: list[str]
    uploaded_at: str
    updated_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentMetadata]
    total: int
    page: int
    page_size: int


class DocumentUpdateRequest(BaseModel):
    category: str | None = None
    description: str | None = None
    tags: list[str] | None = None
