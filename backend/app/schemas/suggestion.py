from typing import Literal

from pydantic import BaseModel


class ExtractedItem(BaseModel):
    category: Literal["condition", "allergy", "medication", "lab_result"]
    confidence: Literal["high", "medium", "low"]
    extracted_data: dict
    source_text: str


class ExtractionResponse(BaseModel):
    items: list[ExtractedItem]


class SuggestionResponse(BaseModel):
    suggestion_id: str
    patient_id: str
    document_id: str
    category: str
    status: str
    confidence: str
    extracted_data: dict
    source_text: str
    duplicate_of: str | None
    created_at: str


class SuggestionListResponse(BaseModel):
    suggestions: list[SuggestionResponse]
    total: int
    pending_count: int
