import re
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

BoundedText = Annotated[str, Field(max_length=1_000)]
MetricStatus = Literal["critical", "high", "low", "abnormal", "normal", "unknown"]
ClassificationBasis = Literal[
    "report_flag", "reference_range", "explicit_text", "unknown"
]
Confidence = Literal["high", "medium", "low"]
AnalysisStatus = Literal[
    "not_applicable",
    "not_requested",
    "disabled",
    "queued",
    "processing",
    "completed",
    "failed",
]

_OCR_FLAGGED_NUMBER = re.compile(
    r"^\s*(?P<flag>[vV↓▼↑▲^])\s*(?P<number>[<>]?\s*[-+]?\d[\d,.]*)\s*$"
)
_PLAIN_NUMBER = re.compile(r"^\s*[-+]?\d[\d,.]*\s*$")
_BOUNDED_RANGE = re.compile(
    r"^\s*(?P<low>[-+]?\d[\d,.]*)\s*[-–—]\s*(?P<high>[-+]?\d[\d,.]*)"
)
_ONE_SIDED_RANGE = re.compile(
    r"^\s*(?P<op><=|>=|<|>)\s*(?P<bound>[-+]?\d[\d,.]*)"
)


def _number(raw: str) -> float:
    return float(raw.replace(",", ""))


def _status_from_printed_range(value: str, reference_range: str) -> MetricStatus | None:
    if not _PLAIN_NUMBER.match(value):
        return None
    numeric = _number(value.strip())
    bounded = _BOUNDED_RANGE.match(reference_range)
    if bounded:
        low = _number(bounded.group("low"))
        high = _number(bounded.group("high"))
        if numeric < low:
            return "low"
        if numeric > high:
            return "high"
        return "normal"

    one_sided = _ONE_SIDED_RANGE.match(reference_range)
    if not one_sided:
        return None
    bound = _number(one_sided.group("bound"))
    op = one_sided.group("op")
    in_range = {
        "<": numeric < bound,
        "<=": numeric <= bound,
        ">": numeric > bound,
        ">=": numeric >= bound,
    }[op]
    if in_range:
        return "normal"
    return "high" if op.startswith("<") else "low"


class LabMetric(BaseModel):
    """A single metric extracted and classified from the report itself."""

    name: str = Field(..., min_length=1, max_length=200)
    value: str = Field(default="", max_length=100)
    unit: str = Field(default="", max_length=100)
    reference_range: str = Field(default="", max_length=200)
    status: MetricStatus = "unknown"
    classification_basis: ClassificationBasis = "unknown"
    explanation: str = Field(default="", max_length=500)
    source_text: str = Field(default="", max_length=1_000)
    confidence: Confidence = "medium"

    @model_validator(mode="after")
    def normalize_report_flags_and_critical_status(self) -> "LabMetric":
        flagged = _OCR_FLAGGED_NUMBER.match(self.value)
        if flagged:
            self.value = flagged.group("number").replace(" ", "")
            is_low = flagged.group("flag") in {"v", "V", "↓", "▼"}
            self.status = "low" if is_low else "high"
            self.classification_basis = "report_flag"
            if not self.explanation:
                self.explanation = (
                    "The report marks this result low."
                    if is_low
                    else "The report marks this result high."
                )
        if self.status == "critical" and self.classification_basis != "report_flag":
            self.status = "abnormal"
        if self.classification_basis == "reference_range":
            range_status = _status_from_printed_range(
                self.value, self.reference_range
            )
            if range_status is not None:
                self.status = range_status
                self.explanation = {
                    "normal": "The value is within the reference range printed in the report.",
                    "low": "The value is below the reference range printed in the report.",
                    "high": "The value is above the reference range printed in the report.",
                }[range_status]
        return self


class LabAnalysisContent(BaseModel):
    """Validated structured output returned by the analysis model."""

    summary: str = Field(..., min_length=1, max_length=1_000)
    normal_summary: str = Field(default="", max_length=1_500)
    abnormal_summary: str = Field(default="", max_length=1_500)
    next_steps: str = Field(default="", max_length=1_500)
    report_date: str | None = Field(default=None, max_length=50)
    metrics: list[LabMetric] = Field(default_factory=list, max_length=60)
    limitations: list[BoundedText] = Field(default_factory=list, max_length=10)


class LabReportAnalysis(LabAnalysisContent):
    critical_count: int = Field(ge=0)
    abnormal_count: int = Field(ge=0)
    normal_count: int = Field(ge=0)
    unknown_count: int = Field(ge=0)
    disclaimer: str = Field(..., min_length=1, max_length=500)


class LabAnalysisResponse(BaseModel):
    document_id: str
    status: AnalysisStatus
    analysis: LabReportAnalysis | None = None
    error: str | None = Field(default=None, max_length=500)
    analyzed_at: str | None = None
