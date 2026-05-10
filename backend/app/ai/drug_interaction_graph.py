"""Drug interaction checker via structured LLM output + RxNorm/OpenFDA enrichment.

Flow:
  1. Enrich each proposed drug: RxNorm → active ingredient/salt, OpenFDA → label data.
  2. Pass enriched pharmacological data + patient context to the LLM.
  3. LLM returns structured DrugInteraction list grounded in authoritative data.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.drug_lookup import enrich_medications, format_enriched_context
from app.ai.llm import get_llm_deterministic
from app.schemas.drug_interaction import (
    DrugInteractionCheckResponse,
    DrugInteractionCheckResponseAI,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a clinical pharmacology assistant. Screen proposed medications for safety concerns.

You will receive:
1. A list of proposed medications (name, dosage, frequency).
2. Patient context: current medications, documented allergies, and active conditions.
3. Pharmacological Data from RxNorm and OpenFDA (when available).

When pharmacological lookup data is provided:
- Use the resolved active ingredient(s)/salt(s) — not just brand names — for your analysis.
- FDA-listed interactions are authoritative. Always flag these with appropriate severity.
- FDA boxed warnings must be reported as "critical" severity.
- If a proposed dosage exceeds the FDA maximum recommended daily dose, report it as a \
separate finding ("critical" if significantly exceeded, "moderate" if borderline).
- If a drug could not be resolved in RxNorm, use your clinical knowledge but note uncertainty \
in the description.

Check all of the following:
- Proposed medications against each other (drug-drug; use resolved ingredients where available).
- Proposed medications against the patient's existing medications (drug-drug).
- Proposed medications against the patient's documented allergies (drug-allergy).
- Proposed medications against the patient's active conditions for contraindications \
(e.g., metformin in severe renal impairment, beta-blockers in asthma).
- Proposed dosages against FDA dosage guidance and standard safe daily limits.

For each interaction or safety concern found:
- severity: "critical" = contraindicated, life-threatening, or boxed warning; \
"moderate" = close monitoring required; "minor" = awareness advised.
- title: ≤10 words identifying the interaction.
- description: ≤40 words describing the risk and recommended action.
- implicated_drugs: list of the drug names involved.

Rules:
- Only flag interactions that are well-documented in recognised clinical literature \
or present in the provided FDA/RxNorm data.
- Do not invent patient data. Use only what is provided in the context.
- Do not flag interactions between existing (non-proposed) medications.
- If no interactions are found, return {"interactions": []}.
- Respond with valid structured output only — no additional prose.
"""


async def check_drug_interactions(
    proposed_medications: list[dict],
    patient_context: str,
) -> DrugInteractionCheckResponse:
    """Check proposed medications for drug-drug, drug-allergy, and drug-condition interactions.

    Each drug is enriched with RxNorm ingredient resolution and OpenFDA label data before
    being passed to the LLM, grounding the check in authoritative pharmaceutical data.
    """
    checked_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # --- Phase 1: Enrich with RxNorm + OpenFDA ---
    pharma_context = ""
    try:
        enriched = await enrich_medications(proposed_medications)
        pharma_context = format_enriched_context(enriched)
        logger.info("drug_lookup_enrichment completed drugs=%d", len(enriched))
    except Exception:
        logger.warning("Drug lookup enrichment failed; proceeding with LLM-only check")

    # --- Phase 2: Format proposed medications ---
    proposed_lines = []
    for m in proposed_medications:
        parts = [m.get("name", "")]
        if m.get("dosage"):
            parts.append(m["dosage"])
        if m.get("frequency"):
            parts.append(m["frequency"])
        proposed_lines.append("- " + " — ".join(p for p in parts if p))
    proposed_text = "\n".join(proposed_lines) if proposed_lines else "(none)"

    # --- Phase 3: Build LLM messages with enriched context ---
    human_content = (
        f"## Proposed Medications\n{proposed_text}\n\n"
        f"## Patient Context\n{patient_context}"
    )
    if pharma_context:
        human_content += f"\n\n{pharma_context}"

    llm = get_llm_deterministic()
    structured_llm = llm.with_structured_output(DrugInteractionCheckResponseAI)
    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=human_content),
    ]

    def _invoke() -> DrugInteractionCheckResponseAI:
        result = structured_llm.invoke(messages)
        if not isinstance(result, DrugInteractionCheckResponseAI):
            result = DrugInteractionCheckResponseAI.model_validate(result)
        return result

    try:
        ai_result = await asyncio.to_thread(_invoke)
        logger.info(
            "drug_interaction_check completed interactions=%d",
            len(ai_result.interactions),
        )
        return DrugInteractionCheckResponse(
            interactions=ai_result.interactions,
            checked_at=checked_at,
        )
    except Exception:
        logger.exception("drug_interaction_check failed; returning empty result")
        return DrugInteractionCheckResponse(interactions=[], checked_at=checked_at)
