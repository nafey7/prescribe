"""LLM prompt templates for medical document extraction."""

EXTRACTION_SYSTEM_PROMPT = """You are a medical document analyzer. Extract structured medical information from the provided document text.

Rules:
- Only extract information explicitly stated in the document. Never infer or fabricate data.
- For each extracted item, include the exact source text snippet that supports it.
- Assign a confidence level: "high" if the information is clearly and unambiguously stated, "medium" if it requires some interpretation, "low" if it is implied or partially legible.
- If the document contains no extractable medical information, return an empty items list.
- Extract dates in ISO format (YYYY-MM-DD) when available, or year-only (YYYY) when only the year is mentioned.

The document category is: {document_category}
Focus on extracting: {extraction_targets}
"""

EXTRACTION_TARGETS: dict[str, str] = {
    "lab_result": "lab results (primary), conditions (if mentioned)",
    "prescription": "medications (primary), conditions (if mentioned)",
    "clinical_note": "conditions, medications, allergies, lab results",
    "imaging": "conditions (findings), notes",
    "other": "all categories — conditions, allergies, medications, lab results (best-effort)",
    "insurance": "all categories — conditions, allergies, medications, lab results (best-effort)",
}

EXTRACTION_USER_PROMPT = """Analyze the following medical document text and extract structured medical information.

For each item you find, output it with these fields:
- category: one of "condition", "allergy", "medication", "lab_result"
- confidence: one of "high", "medium", "low"
- source_text: the exact snippet from the document
- extracted_data: structured data depending on category

For conditions, extracted_data should have: name, diagnosed_year (int or null), status ("active"/"resolved"/"unknown"), notes
For allergies, extracted_data should have: substance, reaction, documented_date
For medications, extracted_data should have: name, dosage, frequency, since
For lab_result, extracted_data should have: date, results (list of objects with name, value, status, reference_range)

Document text:
---
{document_text}
---

Return a JSON object with a single key "items" containing a list of extracted items. If nothing can be extracted, return {{"items": []}}."""
