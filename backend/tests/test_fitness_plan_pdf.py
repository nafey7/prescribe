"""Unit tests for fitness plan PDF rendering."""

from io import BytesIO

from PyPDF2 import PdfReader

from app.schemas.fitness_plan import DEFAULT_FITNESS_DISCLAIMER, FitnessPlanPayload
from app.service.fitness_plan_pdf import render_fitness_plan_pdf


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    return "".join(page.extract_text() or "" for page in reader.pages)


def _fixture_payload() -> FitnessPlanPayload:
    return FitnessPlanPayload.model_validate(
        {
            "num_days": 2,
            "goal": "Build core strength",
            "fitness_level": "intermediate",
            "summary": "Two-day core-focused programme.",
            "medical_notes": "Avoid heavy lifting due to lower-back history.",
            "days": [
                {
                    "day_index": 1,
                    "label": "Day 1 – Core",
                    "sessions": [
                        {
                            "session_type": "strength",
                            "name": "Core circuit",
                            "duration_minutes": 30,
                            "intensity": "moderate",
                            "warmup_notes": "5 min light walk",
                            "cooldown_notes": "Stretch for 5 min",
                            "exercises": [
                                {
                                    "name": "Plank",
                                    "duration_minutes": 1,
                                    "notes": "Keep hips level",
                                    "modifications": ["Knee plank for beginners"],
                                },
                                {
                                    "name": "Crunch",
                                    "sets": 3,
                                    "reps": "15",
                                    "rest_seconds": 30,
                                },
                            ],
                        }
                    ],
                },
                {
                    "day_index": 2,
                    "label": "Day 2",
                    "is_rest_day": True,
                },
            ],
        }
    )


def test_render_fitness_plan_pdf_magic_bytes():
    payload = _fixture_payload()
    pdf_bytes = render_fitness_plan_pdf(payload, title="Your fitness plan", subtitle="Dr. Smith")
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 500


def test_render_fitness_plan_pdf_key_text():
    payload = _fixture_payload()
    text = _extract_pdf_text(
        render_fitness_plan_pdf(payload, title="Your fitness plan", subtitle="Dr. Smith")
    )
    assert "Your fitness plan" in text
    assert "Dr. Smith" in text
    assert "Build core strength" in text
    assert "Two-day core-focused" in text
    assert "Core circuit" in text
    assert "Plank" in text
    assert "Crunch" in text
    assert "5 min light walk" in text
    assert "Rest Day" in text
    assert DEFAULT_FITNESS_DISCLAIMER[:40] in text


def test_render_includes_medical_notes():
    payload = _fixture_payload()
    text = _extract_pdf_text(render_fitness_plan_pdf(payload, title="Plan"))
    assert "lower-back" in text or "lower-back" in text.replace("\n", "")


def test_render_uses_default_title_when_blank():
    payload = _fixture_payload()
    text = _extract_pdf_text(render_fitness_plan_pdf(payload, title="   ", subtitle=None))
    assert "Fitness plan" in text


def test_render_no_subtitle_omits_subtitle_line():
    payload = _fixture_payload()
    text = _extract_pdf_text(render_fitness_plan_pdf(payload, title="Plan", subtitle=None))
    assert "Dr. Smith" not in text


def test_render_exercise_modifications_appear():
    payload = _fixture_payload()
    text = _extract_pdf_text(render_fitness_plan_pdf(payload, title="Plan"))
    assert "Knee plank" in text
