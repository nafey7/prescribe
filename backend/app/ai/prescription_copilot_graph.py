"""Synchronous LangGraph-backed prescription suggestion via structured output."""

from __future__ import annotations

import asyncio
import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.llm import get_llm
from app.schemas.prescription import PrescriptionSuggestionResponse

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are an AI assistant helping a licensed doctor write a prescription.
You will receive:
1. The patient's medical context (conditions, current medications, allergies, family history).
2. The doctor's natural-language description of what they want to prescribe.

Your task is to produce a structured prescription suggestion with:
- diagnosis_summary: a concise clinical diagnosis label (e.g. "Acute bacterial sinusitis")
- notes: follow-up instructions, warnings, or clinical remarks; if the patient has an \
allergy to any suggested medication, flag it here explicitly
- medications: a list of medications with name, dosage, frequency, duration, and instructions

Rules:
- Always fill every medication field (name, dosage, frequency, duration, instructions). \
Use an empty string only if a field genuinely does not apply.
- If the doctor's description mentions a drug the patient is allergic to, include a clear \
warning in notes and either omit that drug or suggest a safe alternative.
- Do not invent patient data. Only use what is provided in the patient context.
- Respond with valid structured output only — no additional prose.
"""


async def generate_prescription_suggestion(
    prompt: str,
    patient_context: str,
) -> PrescriptionSuggestionResponse:
    """Invoke the LLM with structured output and return a validated suggestion."""
    llm = get_llm()
    structured_llm = llm.with_structured_output(PrescriptionSuggestionResponse)

    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"## Patient Medical Context\n{patient_context}\n\n"
                f"## Doctor's Prescription Request\n{prompt}"
            )
        ),
    ]

    def _invoke() -> PrescriptionSuggestionResponse:
        result = structured_llm.invoke(messages)
        if not isinstance(result, PrescriptionSuggestionResponse):
            result = PrescriptionSuggestionResponse.model_validate(result)
        return result

    suggestion = await asyncio.to_thread(_invoke)
    logger.info(
        "prescription_copilot_suggestion generated medications=%d",
        len(suggestion.medications),
    )
    return suggestion
