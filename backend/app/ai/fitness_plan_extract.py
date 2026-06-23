"""Extract a validated FitnessPlanPayload from LangGraph message state.

The `submit_fitness_plan` tool is called by the LLM as an AIMessage with tool_calls.
After the graph runs, we scan the final message list for any AIMessage that called
`submit_fitness_plan` and validate its args against FitnessPlanPayload.
"""
from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from app.schemas.fitness_plan import FitnessPlanPayload

logger = logging.getLogger(__name__)

_TOOL_NAME = "submit_fitness_plan"


def extract_fitness_plan_from_messages(messages: list[Any]) -> FitnessPlanPayload | None:
    """Scan LangGraph message list for a `submit_fitness_plan` tool call and validate its args.

    Returns a validated FitnessPlanPayload or None if no valid call is found.
    Logs a warning if args are present but fail validation.
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
                payload = FitnessPlanPayload.model_validate(args)
                logger.info(
                    "fitness_plan_extracted num_days=%d days=%d",
                    payload.num_days,
                    len(payload.days),
                )
                return payload
            except ValidationError:
                logger.warning(
                    "submit_fitness_plan tool args failed validation — treating as text-only",
                    exc_info=True,
                )
    return None
