"""Drug ingredient and interaction lookup via RxNorm and OpenFDA APIs.

RxNorm (NLM) resolves brand/generic names → RxCUI → active ingredients/salts.
OpenFDA provides FDA drug labels: boxed warnings, interactions, dosage limits.
Both APIs are public, require no API key, and handle ~240 requests/minute.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

_RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"
_OPENFDA_BASE = "https://api.fda.gov/drug"
_TIMEOUT = 6.0  # seconds per individual request


@dataclass
class DrugLookupResult:
    name: str
    dosage: str
    rxcui: str | None
    ingredients: list[str] = field(default_factory=list)
    fda_interactions_text: str = ""
    fda_warnings_text: str = ""
    fda_dosage_text: str = ""
    lookup_note: str = ""


async def _get_rxcui(client: httpx.AsyncClient, drug_name: str) -> str | None:
    try:
        resp = await client.get(
            f"{_RXNORM_BASE}/rxcui.json",
            params={"name": drug_name, "allsrc": "0"},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        rxcuis = resp.json().get("idGroup", {}).get("rxnormId") or []
        return rxcuis[0] if rxcuis else None
    except Exception:
        logger.debug("RxNorm RxCUI lookup failed for %r", drug_name)
        return None


async def _get_ingredients_for_rxcui(client: httpx.AsyncClient, rxcui: str) -> list[str]:
    try:
        resp = await client.get(
            f"{_RXNORM_BASE}/rxcui/{rxcui}/allrelated.json",
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        groups = resp.json().get("allRelatedGroup", {}).get("conceptGroup") or []
        ingredients: list[str] = []
        for grp in groups:
            # IN = Ingredient, PIN = Precise Ingredient
            if grp.get("tty") in ("IN", "PIN"):
                for concept in grp.get("conceptProperties") or []:
                    name = (concept.get("name") or "").strip()
                    if name:
                        ingredients.append(name)
        return ingredients
    except Exception:
        logger.debug("RxNorm ingredient lookup failed for rxcui=%r", rxcui)
        return []


def _extract_label_field(label: dict, *fields: str, max_chars: int = 400) -> str:
    for f in fields:
        val = label.get(f)
        if val:
            text = " ".join(val) if isinstance(val, list) else str(val)
            text = " ".join(text.split())  # collapse whitespace
            return text[:max_chars] + ("…" if len(text) > max_chars else "")
    return ""


async def _get_openfda_label(client: httpx.AsyncClient, drug_name: str) -> dict:
    safe_name = drug_name.replace('"', "").strip()
    for field_name in ("brand_name", "generic_name"):
        try:
            resp = await client.get(
                f"{_OPENFDA_BASE}/label.json",
                params={
                    "search": f'openfda.{field_name}:"{safe_name}"',
                    "limit": "1",
                },
                timeout=_TIMEOUT,
            )
            if resp.status_code == 200:
                results = resp.json().get("results") or []
                if results:
                    return results[0]
        except Exception:
            logger.debug("OpenFDA lookup failed for %r field=%s", drug_name, field_name)
    return {}


async def lookup_drug(
    client: httpx.AsyncClient,
    name: str,
    dosage: str = "",
) -> DrugLookupResult:
    """Resolve a drug name to its active ingredients and fetch its FDA label data."""
    rxcui, label = await asyncio.gather(
        _get_rxcui(client, name),
        _get_openfda_label(client, name),
    )

    ingredients: list[str] = []
    if rxcui:
        ingredients = await _get_ingredients_for_rxcui(client, rxcui)

    # Fallback: extract active_ingredient text directly from FDA label
    if not ingredients and label:
        raw = _extract_label_field(label, "active_ingredient", max_chars=200)
        if raw:
            ingredients = [raw]

    if rxcui and ingredients:
        lookup_note = f"Resolved via RxNorm to: {', '.join(ingredients)}"
    elif rxcui:
        lookup_note = f"Found in RxNorm (RxCUI {rxcui}), no ingredient mapping returned"
    else:
        lookup_note = "Not found in RxNorm — using drug name as entered"

    return DrugLookupResult(
        name=name,
        dosage=dosage,
        rxcui=rxcui,
        ingredients=ingredients,
        fda_interactions_text=_extract_label_field(
            label, "drug_interactions", "drug_interactions_table"
        ),
        fda_warnings_text=_extract_label_field(
            label, "boxed_warning", "warnings", "warnings_and_cautions"
        ),
        fda_dosage_text=_extract_label_field(
            label,
            "dosage_and_administration",
            "dosage_and_administration_table",
            max_chars=300,
        ),
        lookup_note=lookup_note,
    )


async def enrich_medications(proposed: list[dict]) -> list[DrugLookupResult]:
    """Concurrently resolve ingredients and fetch FDA label data for all proposed drugs."""
    async with httpx.AsyncClient() as client:
        tasks = [
            lookup_drug(client, m["name"], m.get("dosage", ""))
            for m in proposed
            if (m.get("name") or "").strip()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    out: list[DrugLookupResult] = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            name = proposed[i].get("name", "unknown")
            logger.warning("Drug lookup failed for %r: %s", name, r)
            out.append(
                DrugLookupResult(
                    name=name,
                    dosage=proposed[i].get("dosage", ""),
                    rxcui=None,
                    lookup_note="Lookup failed — using drug name as entered",
                )
            )
        else:
            out.append(r)  # type: ignore[arg-type]
    return out


def format_enriched_context(results: list[DrugLookupResult]) -> str:
    """Format drug lookup results into a prompt section for the LLM."""
    if not results:
        return ""

    lines = [
        "## Pharmacological Data (RxNorm + OpenFDA)",
        "Authoritative source — prioritize over general training knowledge.\n",
    ]
    for r in results:
        header = r.name + (f" ({r.dosage})" if r.dosage else "")
        lines.append(f"### {header}")
        lines.append(f"- Lookup: {r.lookup_note}")
        if r.ingredients:
            lines.append(f"- Active ingredient(s)/salt(s): {', '.join(r.ingredients)}")
        if r.fda_warnings_text:
            lines.append(f"- FDA warnings: {r.fda_warnings_text}")
        if r.fda_interactions_text:
            lines.append(f"- FDA-listed interactions: {r.fda_interactions_text}")
        if r.fda_dosage_text:
            lines.append(f"- FDA dosage guidance: {r.fda_dosage_text}")
        lines.append("")

    return "\n".join(lines)
