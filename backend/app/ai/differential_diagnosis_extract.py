"""Extract a validated DifferentialDiagnosisPayload from LangGraph message state.

The `submit_differential_diagnosis` tool is called by the LLM as an AIMessage with
tool_calls. After the graph runs, we scan the final message list for any AIMessage that
called `submit_differential_diagnosis` and validate its args against
DifferentialDiagnosisPayload.
"""
from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from app.schemas.differential_diagnosis import DifferentialDiagnosisPayload

logger = logging.getLogger(__name__)

_TOOL_NAME = "submit_differential_diagnosis"


def extract_differential_diagnosis_from_messages(
    messages: list[Any],
) -> DifferentialDiagnosisPayload | None:
    """Scan messages for the most recent valid `submit_differential_diagnosis` tool call.

    Walks the message list back-to-front so that if the LLM produces multiple differentials
    in the same checkpoint, the latest one wins. Returns ``None`` if none of the calls
    validate.
    """
    for msg in reversed(messages):
        tool_calls = getattr(msg, "tool_calls", None)
        if not tool_calls:
            continue
        for tc in tool_calls:
            name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
            if name != _TOOL_NAME:
                continue
            args = tc.get("args") if isinstance(tc, dict) else getattr(tc, "args", {})
            if not isinstance(args, dict):
                continue
            try:
                payload = DifferentialDiagnosisPayload.model_validate(args)
                logger.info(
                    "differential_diagnosis_extracted n_diagnoses=%d",
                    len(payload.diagnoses),
                )
                return payload
            except ValidationError:
                logger.warning(
                    "submit_differential_diagnosis tool args failed validation — "
                    "treating as text-only",
                    exc_info=True,
                )
    return None
