"""Unit tests for Phase 1-2 fitness plan implementation.

Covers:
- FitnessPlanPayload schema validation and clamping
- extract_fitness_plan_from_messages with fake message objects
- ChatResponse / MessageSchema backward compatibility with fitness_plan field
"""
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.chat import ChatResponse, MessageSchema
from app.schemas.fitness_plan import MAX_FITNESS_PLAN_DAYS, FitnessPlanPayload


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_payload(**kwargs) -> dict:
    base = {
        "num_days": 3,
        "goal": "Improve cardiovascular endurance",
        "fitness_level": "beginner",
        "days": [
            {
                "day_index": 1,
                "label": "Day 1",
                "sessions": [
                    {
                        "session_type": "cardio",
                        "name": "Morning jog",
                        "duration_minutes": 30,
                        "intensity": "moderate",
                        "exercises": [
                            {"name": "Jog", "duration_minutes": 25},
                        ],
                    }
                ],
            },
            {
                "day_index": 2,
                "is_rest_day": True,
            },
            {
                "day_index": 3,
                "sessions": [
                    {
                        "session_type": "strength",
                        "name": "Upper body",
                        "duration_minutes": 40,
                        "intensity": "moderate",
                        "exercises": [
                            {"name": "Push-up", "sets": 3, "reps": "10"},
                        ],
                    }
                ],
            },
        ],
    }
    base.update(kwargs)
    return base


def _make_ai_message(tool_calls: list[dict]) -> SimpleNamespace:
    return SimpleNamespace(tool_calls=tool_calls, type="ai")


def _make_tool_call(name: str, args: dict) -> dict:
    return {"name": name, "args": args, "id": "tc-001"}


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


class TestFitnessPlanPayloadValidation:
    def test_valid_payload(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        assert fp.num_days == 3
        assert len(fp.days) == 3

    def test_clamps_above_max(self):
        fp = FitnessPlanPayload.model_validate(_make_payload(num_days=99))
        assert fp.num_days == MAX_FITNESS_PLAN_DAYS

    def test_clamps_below_min(self):
        fp = FitnessPlanPayload.model_validate(_make_payload(num_days=0))
        assert fp.num_days == 1

    def test_clamps_negative(self):
        fp = FitnessPlanPayload.model_validate(_make_payload(num_days=-5))
        assert fp.num_days == 1

    def test_days_required(self):
        with pytest.raises(ValidationError):
            FitnessPlanPayload.model_validate({"num_days": 3, "goal": "Run a 5k"})

    def test_goal_required(self):
        data = _make_payload()
        del data["goal"]
        with pytest.raises(ValidationError):
            FitnessPlanPayload.model_validate(data)

    def test_invalid_fitness_level(self):
        with pytest.raises(ValidationError):
            FitnessPlanPayload.model_validate(_make_payload(fitness_level="elite"))

    def test_invalid_session_type(self):
        data = _make_payload()
        data["days"][0]["sessions"][0]["session_type"] = "yoga"
        with pytest.raises(ValidationError):
            FitnessPlanPayload.model_validate(data)

    def test_invalid_intensity(self):
        data = _make_payload()
        data["days"][0]["sessions"][0]["intensity"] = "extreme"
        with pytest.raises(ValidationError):
            FitnessPlanPayload.model_validate(data)

    def test_exercise_name_required(self):
        data = _make_payload()
        data["days"][0]["sessions"][0]["exercises"][0] = {"duration_minutes": 10}
        with pytest.raises(ValidationError):
            FitnessPlanPayload.model_validate(data)

    def test_disclaimer_defaults(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        assert "educational" in fp.disclaimer.lower()

    def test_summary_defaults_empty(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        assert fp.summary == ""

    def test_medical_notes_defaults_empty(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        assert fp.medical_notes == ""

    def test_rest_day_no_sessions_needed(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        assert fp.days[1].is_rest_day is True
        assert fp.days[1].sessions == []


# ---------------------------------------------------------------------------
# Extraction from graph state messages
# ---------------------------------------------------------------------------


class TestExtractFitnessPlanFromMessages:
    def test_extracts_valid_payload(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        msg = _make_ai_message([_make_tool_call("submit_fitness_plan", _make_payload())])
        result = extract_fitness_plan_from_messages([msg])
        assert result is not None
        assert result.goal == "Improve cardiovascular endurance"
        assert len(result.days) == 3

    def test_returns_none_when_no_tool_calls(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        msg = SimpleNamespace(tool_calls=[], type="ai")
        assert extract_fitness_plan_from_messages([msg]) is None

    def test_returns_none_for_other_tools(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        msg = _make_ai_message([_make_tool_call("submit_meal_plan", {"num_days": 1, "days": []})])
        assert extract_fitness_plan_from_messages([msg]) is None

    def test_returns_none_on_missing_goal(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        bad = _make_payload()
        del bad["goal"]
        msg = _make_ai_message([_make_tool_call("submit_fitness_plan", bad)])
        assert extract_fitness_plan_from_messages([msg]) is None

    def test_no_tool_calls_attribute(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        msg = SimpleNamespace(type="human")
        assert extract_fitness_plan_from_messages([msg]) is None

    def test_finds_latest_match_in_list(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        a1 = _make_payload(goal="Goal A")
        a2 = _make_payload(goal="Goal B")
        msg1 = _make_ai_message([_make_tool_call("submit_fitness_plan", a1)])
        msg2 = _make_ai_message([_make_tool_call("submit_fitness_plan", a2)])
        result = extract_fitness_plan_from_messages([msg1, msg2])
        assert result is not None
        assert result.goal == "Goal B"

    def test_clamps_in_extraction(self):
        from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages

        msg = _make_ai_message([_make_tool_call("submit_fitness_plan", _make_payload(num_days=99))])
        result = extract_fitness_plan_from_messages([msg])
        assert result is not None
        assert result.num_days == MAX_FITNESS_PLAN_DAYS


# ---------------------------------------------------------------------------
# ChatResponse / MessageSchema backward compat
# ---------------------------------------------------------------------------


class TestSchemasBackwardCompat:
    def test_chat_response_defaults_null_fitness_plan(self):
        resp = ChatResponse(message="hi", chat_id="c1", message_id="m1")
        assert resp.fitness_plan is None

    def test_chat_response_with_fitness_plan(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        resp = ChatResponse(
            message="here is your plan",
            chat_id="c1",
            message_id="m1",
            message_type="fitness_plan",
            fitness_plan=fp,
        )
        assert resp.message_type == "fitness_plan"
        assert resp.fitness_plan is not None
        assert resp.fitness_plan.goal == "Improve cardiovascular endurance"

    def test_message_schema_defaults_null_fitness_plan(self):
        ms = MessageSchema(role="user", content="hi", timestamp=datetime.now(timezone.utc))
        assert ms.fitness_plan is None

    def test_message_schema_with_fitness_plan(self):
        fp = FitnessPlanPayload.model_validate(_make_payload())
        ms = MessageSchema(
            role="assistant",
            content="plan attached",
            timestamp=datetime.now(timezone.utc),
            message_type="fitness_plan",
            fitness_plan=fp,
        )
        assert ms.message_type == "fitness_plan"
        assert ms.fitness_plan is not None
