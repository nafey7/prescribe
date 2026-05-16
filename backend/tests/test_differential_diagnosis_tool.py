"""Unit tests for the differential diagnosis tool, schema, and extractor.

Covers:
- DifferentialDiagnosisPayload schema validation and rank-renumbering
- submit_differential_diagnosis tool docstring contract
- extract_differential_diagnosis_from_messages with fake message objects
- ChatResponse / MessageSchema backward compatibility with differential_diagnosis field
"""
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.ai.differential_diagnosis_extract import (
    extract_differential_diagnosis_from_messages,
)
from app.ai.tools import submit_differential_diagnosis
from app.schemas.chat import ChatResponse, MessageSchema
from app.schemas.differential_diagnosis import (
    DEFAULT_DDX_DISCLAIMER,
    Diagnosis,
    DifferentialDiagnosisPayload,
    MAX_DDX_DIAGNOSES,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _diag(**kwargs) -> dict:
    base = {
        "rank": 1,
        "condition": "Acute coronary syndrome",
        "probability": 45,
        "tier": "high",
        "rationale": "Classic exertional chest pressure with diaphoresis.",
        "supporting_evidence": ["Type 2 diabetes", "Father with HTN"],
        "contradicting_evidence": [],
        "key_workup": ["12-lead ECG", "Serial troponins"],
    }
    base.update(kwargs)
    return base


def _payload(**kwargs) -> dict:
    base = {
        "summary": "47yo with diabetes presents with exertional chest pressure and dyspnea.",
        "diagnoses": [_diag()],
        "red_flags": ["ACS — obtain ECG and troponins immediately"],
        "recommended_workup": ["12-lead ECG", "Troponin", "CXR"],
        "reasoning_notes": "Diabetes and family-history HTN raise cardiac risk.",
    }
    base.update(kwargs)
    return base


def _make_ai_message(tool_calls: list[dict]) -> SimpleNamespace:
    return SimpleNamespace(tool_calls=tool_calls, type="ai")


def _make_tool_call(name: str, args: dict, tc_id: str = "tc-001") -> dict:
    return {"name": name, "args": args, "id": tc_id}


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


class TestDifferentialDiagnosisPayloadValidation:
    def test_minimal_payload_validates(self):
        p = DifferentialDiagnosisPayload.model_validate(_payload())
        assert len(p.diagnoses) == 1
        assert p.diagnoses[0].condition == "Acute coronary syndrome"
        assert p.disclaimer == DEFAULT_DDX_DISCLAIMER

    def test_rejects_empty_diagnoses(self):
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(_payload(diagnoses=[]))

    def test_rejects_too_many_diagnoses(self):
        many = [
            _diag(rank=i + 1, condition=f"Condition {i + 1}", probability=10)
            for i in range(MAX_DDX_DIAGNOSES + 1)
        ]
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(_payload(diagnoses=many))

    def test_rejects_invalid_probability_above(self):
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(
                _payload(diagnoses=[_diag(probability=150)])
            )

    def test_rejects_invalid_probability_below(self):
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(
                _payload(diagnoses=[_diag(probability=-1)])
            )

    def test_rejects_invalid_tier(self):
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(
                _payload(diagnoses=[_diag(tier="urgent")])
            )

    def test_rejects_blank_condition(self):
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(
                _payload(diagnoses=[_diag(condition="   ")])
            )

    def test_renumbers_ranks_by_probability_desc(self):
        # Input ranks intentionally scrambled.
        diagnoses = [
            _diag(rank=5, condition="Costochondritis", probability=8, tier="low"),
            _diag(rank=2, condition="ACS", probability=55, tier="high"),
            _diag(rank=9, condition="GERD", probability=20, tier="moderate"),
        ]
        p = DifferentialDiagnosisPayload.model_validate(_payload(diagnoses=diagnoses))
        names_in_order = [d.condition for d in p.diagnoses]
        assert names_in_order == ["ACS", "GERD", "Costochondritis"]
        assert [d.rank for d in p.diagnoses] == [1, 2, 3]

    def test_summary_required(self):
        data = _payload()
        del data["summary"]
        with pytest.raises(ValidationError):
            DifferentialDiagnosisPayload.model_validate(data)

    def test_defaults_for_optional_fields(self):
        # red_flags / recommended_workup / reasoning_notes are optional and default sensibly.
        minimal = {
            "summary": "Brief overview",
            "diagnoses": [_diag()],
        }
        p = DifferentialDiagnosisPayload.model_validate(minimal)
        assert p.red_flags == []
        assert p.recommended_workup == []
        assert p.reasoning_notes == ""
        assert p.disclaimer == DEFAULT_DDX_DISCLAIMER

    def test_diagnosis_default_evidence_lists_are_empty(self):
        d = Diagnosis.model_validate(
            {
                "rank": 1,
                "condition": "X",
                "probability": 30,
                "tier": "high",
                "rationale": "r",
            }
        )
        assert d.supporting_evidence == []
        assert d.contradicting_evidence == []
        assert d.key_workup == []


# ---------------------------------------------------------------------------
# Tool docstring contract
# ---------------------------------------------------------------------------


class TestSubmitDifferentialDiagnosisTool:
    def test_tool_name(self):
        assert submit_differential_diagnosis.name == "submit_differential_diagnosis"

    def test_docstring_mentions_key_phrases(self):
        desc = submit_differential_diagnosis.description or ""
        for phrase in (
            "differential",
            "WHEN TO CALL",
            "search_patient_records",
            "supporting_evidence",
            "red_flags",
        ):
            assert phrase in desc, f"Tool docstring missing key phrase: {phrase!r}"


# ---------------------------------------------------------------------------
# Extractor
# ---------------------------------------------------------------------------


class TestExtractDifferentialDiagnosisFromMessages:
    def test_extracts_valid_payload(self):
        msg = _make_ai_message(
            [_make_tool_call("submit_differential_diagnosis", _payload())]
        )
        result = extract_differential_diagnosis_from_messages([msg])
        assert result is not None
        assert len(result.diagnoses) == 1
        assert result.diagnoses[0].condition == "Acute coronary syndrome"

    def test_returns_none_when_empty_messages(self):
        assert extract_differential_diagnosis_from_messages([]) is None

    def test_returns_none_when_no_tool_calls(self):
        msg = SimpleNamespace(tool_calls=[], type="ai")
        assert extract_differential_diagnosis_from_messages([msg]) is None

    def test_returns_none_for_other_tools(self):
        msg = _make_ai_message(
            [_make_tool_call("submit_meal_plan", {"num_days": 1, "days": []})]
        )
        assert extract_differential_diagnosis_from_messages([msg]) is None

    def test_returns_none_on_validation_failure(self):
        bad = _payload(diagnoses=[])  # min_length=1 will fail
        msg = _make_ai_message(
            [_make_tool_call("submit_differential_diagnosis", bad)]
        )
        assert extract_differential_diagnosis_from_messages([msg]) is None

    def test_picks_latest_when_multiple_tool_calls(self):
        first = _payload(summary="first attempt")
        second = _payload(summary="second attempt")
        msg1 = _make_ai_message(
            [_make_tool_call("submit_differential_diagnosis", first, tc_id="tc-1")]
        )
        msg2 = _make_ai_message(
            [_make_tool_call("submit_differential_diagnosis", second, tc_id="tc-2")]
        )
        result = extract_differential_diagnosis_from_messages([msg1, msg2])
        assert result is not None
        assert result.summary == "second attempt"

    def test_handles_message_without_tool_calls_attribute(self):
        msg = SimpleNamespace(type="human")
        assert extract_differential_diagnosis_from_messages([msg]) is None


# ---------------------------------------------------------------------------
# ChatResponse / MessageSchema backward compat
# ---------------------------------------------------------------------------


class TestSchemasBackwardCompat:
    def test_chat_response_defaults_null_differential(self):
        resp = ChatResponse(message="hi", chat_id="c1", message_id="m1")
        assert resp.differential_diagnosis is None

    def test_chat_response_with_differential(self):
        dd = DifferentialDiagnosisPayload.model_validate(_payload())
        resp = ChatResponse(
            message="here is the differential",
            chat_id="c1",
            message_id="m1",
            message_type="differential_diagnosis",
            differential_diagnosis=dd,
        )
        assert resp.message_type == "differential_diagnosis"
        assert resp.differential_diagnosis is not None
        assert resp.differential_diagnosis.diagnoses[0].condition == (
            "Acute coronary syndrome"
        )

    def test_message_schema_defaults_null_differential(self):
        ms = MessageSchema(
            role="user", content="hi", timestamp=datetime.now(timezone.utc)
        )
        assert ms.differential_diagnosis is None

    def test_message_schema_with_differential(self):
        dd = DifferentialDiagnosisPayload.model_validate(_payload())
        ms = MessageSchema(
            role="assistant",
            content="differential attached",
            timestamp=datetime.now(timezone.utc),
            message_type="differential_diagnosis",
            differential_diagnosis=dd,
        )
        assert ms.message_type == "differential_diagnosis"
        assert ms.differential_diagnosis is not None
