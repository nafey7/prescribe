from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

DEFAULT_DDX_DISCLAIMER = (
    "This differential is an AI-generated decision-support aid for an educational prototype. "
    "It is not a substitute for clinical judgment. Verify every candidate diagnosis against "
    "the patient's full chart, examination findings, and current guidelines before acting."
)

MAX_DDX_DIAGNOSES = 20


class Diagnosis(BaseModel):
    rank: int = Field(..., ge=1, le=MAX_DDX_DIAGNOSES)
    condition: str = Field(..., description="Candidate diagnosis name")
    probability: int = Field(..., ge=0, le=100, description="0-100 relative likelihood")
    tier: Literal["high", "moderate", "low"]
    rationale: str = Field(..., description="One- or two-sentence clinical reasoning")
    supporting_evidence: list[str] = Field(
        default_factory=list,
        description=(
            "Patient-chart factors that raise the probability "
            "(named conditions, meds, labs, family history, lifestyle)"
        ),
    )
    contradicting_evidence: list[str] = Field(
        default_factory=list,
        description="Patient-chart factors that lower the probability or argue against",
    )
    key_workup: list[str] = Field(
        default_factory=list,
        description=(
            "First-line tests or exam steps that would meaningfully shift this "
            "diagnosis up or down"
        ),
    )

    @field_validator("condition")
    @classmethod
    def _strip_condition(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("condition must not be empty")
        return v


class DifferentialDiagnosisPayload(BaseModel):
    summary: str = Field(..., description="2-3 sentence overview of the clinical picture")
    diagnoses: list[Diagnosis] = Field(..., min_length=1, max_length=MAX_DDX_DIAGNOSES)
    red_flags: list[str] = Field(
        default_factory=list,
        description=(
            "Can't-miss diagnoses or warning features the doctor should rule out "
            "regardless of probability"
        ),
    )
    recommended_workup: list[str] = Field(
        default_factory=list,
        description="Suggested first-line tests, exams, or referrals to narrow the differential",
    )
    reasoning_notes: str = Field(
        default="",
        description=(
            "Brief overall reasoning, including which patient factors most shaped the ranking"
        ),
    )
    disclaimer: str = Field(default=DEFAULT_DDX_DISCLAIMER)

    @field_validator("diagnoses")
    @classmethod
    def _ranks_are_sequential(cls, v: list[Diagnosis]) -> list[Diagnosis]:
        """Sort by probability desc and renumber ranks 1..N so the frontend can trust order."""
        sorted_v = sorted(v, key=lambda d: (-d.probability, d.rank))
        for i, d in enumerate(sorted_v, start=1):
            d.rank = i
        return sorted_v
