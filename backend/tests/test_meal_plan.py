"""Tests for Phase 1-3 meal plan implementation.

Covers:
- MealPlanPayload schema validation and clamping
- extract_meal_plan_from_messages with fake message objects
- ChatResponse / MessageSchema backward compatibility
- API endpoint returns new fields (mocked service)
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.chat import ChatResponse, MessageSchema
from app.schemas.meal_plan import MAX_MEAL_PLAN_DAYS, MealPlanPayload


# ---------------------------------------------------------------------------
# Phase 1 — schema validation
# ---------------------------------------------------------------------------


def _make_payload(**kwargs) -> dict:
    base = {
        "num_days": 3,
        "days": [
            {
                "day_index": 1,
                "label": "Day 1",
                "meals": [
                    {"name": "Oatmeal", "description": "With berries", "items": ["oats", "blueberries"]},
                    {"name": "Chicken salad", "description": "Low sodium", "items": []},
                    {"name": "Baked salmon", "description": "With veggies", "items": []},
                ],
            },
            {
                "day_index": 2,
                "meals": [
                    {"name": "Scrambled eggs"},
                    {"name": "Lentil soup"},
                    {"name": "Grilled chicken"},
                ],
            },
            {
                "day_index": 3,
                "meals": [
                    {"name": "Yogurt parfait"},
                    {"name": "Turkey wrap"},
                    {"name": "Stir-fry tofu"},
                ],
            },
        ],
    }
    base.update(kwargs)
    return base


class TestMealPlanPayloadValidation:
    def test_valid_payload(self):
        data = _make_payload()
        mp = MealPlanPayload.model_validate(data)
        assert mp.num_days == 3
        assert len(mp.days) == 3

    def test_default_num_days(self):
        data = _make_payload(num_days=7)
        mp = MealPlanPayload.model_validate(data)
        assert mp.num_days == 7

    def test_clamps_above_max(self):
        data = _make_payload(num_days=99)
        mp = MealPlanPayload.model_validate(data)
        assert mp.num_days == MAX_MEAL_PLAN_DAYS

    def test_clamps_below_min(self):
        data = _make_payload(num_days=0)
        mp = MealPlanPayload.model_validate(data)
        assert mp.num_days == 1

    def test_clamps_negative(self):
        data = _make_payload(num_days=-5)
        mp = MealPlanPayload.model_validate(data)
        assert mp.num_days == 1

    def test_days_required(self):
        with pytest.raises(ValidationError):
            MealPlanPayload.model_validate({"num_days": 3})

    def test_meal_item_name_required(self):
        data = _make_payload()
        data["days"][0]["meals"][0] = {"description": "No name"}
        with pytest.raises(ValidationError):
            MealPlanPayload.model_validate(data)

    def test_disclaimer_defaults(self):
        data = _make_payload()
        mp = MealPlanPayload.model_validate(data)
        assert "educational" in mp.disclaimer.lower()

    def test_summary_defaults_empty(self):
        data = _make_payload()
        mp = MealPlanPayload.model_validate(data)
        assert mp.summary == ""


# ---------------------------------------------------------------------------
# Phase 2 — extraction from graph state messages
# ---------------------------------------------------------------------------


def _make_ai_message(tool_calls: list[dict]) -> SimpleNamespace:
    """Fake AIMessage-like object with tool_calls attribute."""
    return SimpleNamespace(tool_calls=tool_calls, type="ai")


def _make_tool_call(name: str, args: dict) -> dict:
    return {"name": name, "args": args, "id": "tc-001"}


class TestExtractMealPlanFromMessages:
    def test_extracts_valid_payload(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        args = _make_payload()
        msg = _make_ai_message([_make_tool_call("submit_meal_plan", args)])
        result = extract_meal_plan_from_messages([msg])
        assert result is not None
        assert result.num_days == 3
        assert len(result.days) == 3

    def test_returns_none_when_no_tool_calls(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        msg = SimpleNamespace(tool_calls=[], type="ai")
        assert extract_meal_plan_from_messages([msg]) is None

    def test_returns_none_for_other_tools(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        msg = _make_ai_message([_make_tool_call("search_patient_records", {"patient_id": "x"})])
        assert extract_meal_plan_from_messages([msg]) is None

    def test_returns_none_on_invalid_args(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        msg = _make_ai_message([_make_tool_call("submit_meal_plan", {"num_days": 3})])
        # missing required `days` field → validation fails → returns None
        assert extract_meal_plan_from_messages([msg]) is None

    def test_scans_multiple_messages_finds_latest(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        args1 = _make_payload(num_days=3)
        args2 = _make_payload(num_days=5)
        msg1 = _make_ai_message([_make_tool_call("submit_meal_plan", args1)])
        msg2 = SimpleNamespace(tool_calls=[], type="ai")
        msg3 = _make_ai_message([_make_tool_call("submit_meal_plan", args2)])
        result = extract_meal_plan_from_messages([msg1, msg2, msg3])
        assert result is not None
        assert result.num_days == 5

    def test_no_tool_calls_attribute(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        msg = SimpleNamespace(type="human")  # no tool_calls attr
        assert extract_meal_plan_from_messages([msg]) is None

    def test_clamps_days_in_extraction(self):
        from app.ai.meal_plan_extract import extract_meal_plan_from_messages

        args = _make_payload(num_days=20)  # over max
        msg = _make_ai_message([_make_tool_call("submit_meal_plan", args)])
        result = extract_meal_plan_from_messages([msg])
        assert result is not None
        assert result.num_days == MAX_MEAL_PLAN_DAYS


# ---------------------------------------------------------------------------
# Phase 1 — ChatResponse / MessageSchema backward compat
# ---------------------------------------------------------------------------


class TestSchemasBackwardCompat:
    def test_chat_response_defaults(self):
        resp = ChatResponse(message="hi", chat_id="c1", message_id="m1")
        assert resp.message_type == "text"
        assert resp.meal_plan is None

    def test_chat_response_with_meal_plan(self):
        mp = MealPlanPayload.model_validate(_make_payload())
        resp = ChatResponse(
            message="here is your plan",
            chat_id="c1",
            message_id="m1",
            message_type="meal_plan",
            meal_plan=mp,
        )
        assert resp.message_type == "meal_plan"
        assert resp.meal_plan is not None
        assert resp.meal_plan.num_days == 3

    def test_message_schema_defaults(self):
        ms = MessageSchema(role="user", content="hi", timestamp=datetime.now(timezone.utc))
        assert ms.message_type == "text"
        assert ms.meal_plan is None

    def test_message_schema_with_meal_plan(self):
        mp = MealPlanPayload.model_validate(_make_payload())
        ms = MessageSchema(
            role="assistant",
            content="plan attached",
            timestamp=datetime.now(timezone.utc),
            message_type="meal_plan",
            meal_plan=mp,
        )
        assert ms.message_type == "meal_plan"
        assert ms.meal_plan is not None


# ---------------------------------------------------------------------------
# Phase 3 — API endpoint returns new fields
# ---------------------------------------------------------------------------


@pytest.fixture
def client():
    from app.api.dependencies import resolve_patient_chat_patient_id

    async def _override():
        return "john_doe"

    app.dependency_overrides[resolve_patient_chat_patient_id] = _override
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.pop(resolve_patient_chat_patient_id, None)


class TestApiMealPlanFields:
    def test_chat_message_returns_text_type_by_default(self, client):
        with patch("app.api.chat.process_message", new_callable=AsyncMock) as mock_proc:
            mock_proc.return_value = ChatResponse(
                message="Hello!",
                chat_id="c1",
                message_id="m1",
                message_type="text",
            )
            response = client.post(
                "/api/chat/message",
                json={"message": "hello"},
                headers={"X-Patient-Id": "john_doe"},
            )
            assert response.status_code == 200
            body = response.json()
            assert body["message_type"] == "text"
            assert body["meal_plan"] is None

    def test_chat_message_returns_meal_plan_type(self, client):
        mp = MealPlanPayload.model_validate(_make_payload())
        with patch("app.api.chat.process_message", new_callable=AsyncMock) as mock_proc:
            mock_proc.return_value = ChatResponse(
                message="Here is the meal plan.",
                chat_id="c1",
                message_id="m1",
                message_type="meal_plan",
                meal_plan=mp,
            )
            response = client.post(
                "/api/chat/message",
                json={"message": "create a meal plan"},
                headers={"X-Patient-Id": "john_doe"},
            )
            assert response.status_code == 200
            body = response.json()
            assert body["message_type"] == "meal_plan"
            assert body["meal_plan"] is not None
            assert body["meal_plan"]["num_days"] == 3
            assert len(body["meal_plan"]["days"]) == 3
