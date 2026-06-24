from typing import Annotated

from pydantic import BaseModel, Field

BriefBullet = Annotated[str, Field(min_length=1, max_length=500)]


class PreVisitBriefContent(BaseModel):
    """Validated structured output produced by the LLM."""

    summary: str = Field(..., min_length=1, max_length=500)
    recent_documents: list[BriefBullet] = Field(default_factory=list, max_length=4)
    medication_changes: list[BriefBullet] = Field(default_factory=list, max_length=4)
    abnormal_labs: list[BriefBullet] = Field(default_factory=list, max_length=4)
    unresolved_concerns: list[BriefBullet] = Field(default_factory=list, max_length=4)


class PreVisitBriefEvidence(BaseModel):
    document_count: int = Field(ge=0)
    prescription_count: int = Field(ge=0)
    finding_count: int = Field(ge=0)
    pending_finding_count: int = Field(ge=0)


class PreVisitBriefResponse(PreVisitBriefContent):
    generated_at: str
    lookback_days: int = Field(ge=1)
    evidence: PreVisitBriefEvidence
