"""Tests for server-side meal plan PDF rendering."""

from io import BytesIO

from PyPDF2 import PdfReader

from app.schemas.meal_plan import MEAL_PLAN_DISCLAIMER, MealPlanPayload
from app.service.meal_plan_pdf import render_meal_plan_pdf


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    return "".join(page.extract_text() or "" for page in reader.pages)


def _fixture_payload() -> MealPlanPayload:
    return MealPlanPayload.model_validate(
        {
            "num_days": 2,
            "summary": "Low sodium focus for week one.",
            "days": [
                {
                    "day_index": 1,
                    "label": "Day 1 – Monday",
                    "meals": [
                        {
                            "name": "Oatmeal",
                            "description": "With berries",
                            "items": ["oats", "blueberries"],
                        },
                    ],
                },
                {
                    "day_index": 2,
                    "label": "Day 2",
                    "meals": [
                        {
                            "name": "Grilled chicken",
                            "description": "",
                            "items": [],
                        },
                    ],
                },
            ],
        }
    )


def test_render_meal_plan_pdf_magic_bytes_and_key_strings():
    payload = _fixture_payload()
    pdf_bytes = render_meal_plan_pdf(
        payload,
        title="Your meal plan",
        subtitle="Dr. Example",
    )
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 500
    text = _extract_pdf_text(pdf_bytes)
    assert "Your meal plan" in text
    assert "Dr. Example" in text
    assert "Low sodium focus" in text
    assert "Oatmeal" in text
    assert "oats" in text
    assert "Grilled chicken" in text
    assert MEAL_PLAN_DISCLAIMER[:40] in text


def test_render_uses_default_title_when_blank():
    payload = _fixture_payload()
    pdf_bytes = render_meal_plan_pdf(payload, title="   ", subtitle=None)
    text = _extract_pdf_text(pdf_bytes)
    assert "Meal plan" in text
