from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator


class MedicationCheckItem(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Medication name must not be blank")
        return v


class DrugInteraction(BaseModel):
    severity: Literal["critical", "moderate", "minor"]
    title: str
    description: str
    implicated_drugs: list[str]


class DrugInteractionCheckRequest(BaseModel):
    medications: list[MedicationCheckItem]


class DrugInteractionCheckResponseAI(BaseModel):
    """LLM structured-output target — no checked_at timestamp."""

    interactions: list[DrugInteraction]


class DrugInteractionCheckResponse(BaseModel):
    interactions: list[DrugInteraction]
    checked_at: str  # ISO 8601
