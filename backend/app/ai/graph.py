import asyncio
import logging
from collections.abc import AsyncGenerator
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode
from pymongo import MongoClient

from app.ai.differential_diagnosis_extract import (
    extract_differential_diagnosis_from_messages,
)
from app.ai.fitness_plan_extract import extract_fitness_plan_from_messages
from app.ai.llm import get_llm
from app.ai.meal_plan_extract import extract_meal_plan_from_messages
from app.ai.prompts import MEDICAL_SYSTEM_PROMPT_TEMPLATE, get_runtime_prompt_context
from app.ai.state import MedicalChatState
from app.ai.tools import (
    fetch_lab_results,
    search_patient_records,
    submit_differential_diagnosis,
    submit_fitness_plan,
    submit_meal_plan,
    web_search,
)
from app.config import get_settings
from app.schemas.differential_diagnosis import DifferentialDiagnosisPayload
from app.schemas.fitness_plan import FitnessPlanPayload
from app.schemas.meal_plan import MealPlanPayload

logger = logging.getLogger(__name__)


def _flat_text_content(content: Any) -> str:
    """Normalize LLM message/chunk content to plain text (Gemini often uses list blocks)."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
            elif hasattr(block, "text"):
                parts.append(str(getattr(block, "text", "")))
            else:
                parts.append(str(block))
        return "".join(parts)
    return str(content)


_compiled_graph = None
_checkpointer = None
_mongo_client: MongoClient | None = None

TOOLS = [
    search_patient_records,
    fetch_lab_results,
    web_search,
    submit_meal_plan,
    submit_fitness_plan,
    submit_differential_diagnosis,
]


def _get_checkpointer():
    global _checkpointer, _mongo_client
    if _checkpointer is None:
        from langgraph.checkpoint.mongodb import MongoDBSaver

        settings = get_settings()
        _mongo_client = MongoClient(settings.MONGODB_URI)
        _checkpointer = MongoDBSaver(
            _mongo_client,
            db_name=settings.DATABASE_NAME,
        )
        logger.info("Created MongoDB checkpointer")
    return _checkpointer


def _should_continue(state: MedicalChatState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


def _agent_node(state: MedicalChatState) -> dict[str, Any]:
    llm = get_llm()
    llm_with_tools = llm.bind_tools(TOOLS)

    patient_id = state.get("patient_id", "unknown")
    system_prompt = state.get("system_prompt")
    if not system_prompt:
        system_prompt = MEDICAL_SYSTEM_PROMPT_TEMPLATE.format(
            patient_id=patient_id,
            runtime_context=get_runtime_prompt_context(),
        )

    messages = state["messages"]
    has_system = any(
        isinstance(m, SystemMessage) for m in messages
    )
    if not has_system:
        messages = [SystemMessage(content=system_prompt)] + list(messages)

    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


def get_medical_graph():
    global _compiled_graph
    if _compiled_graph is not None:
        return _compiled_graph

    checkpointer = _get_checkpointer()

    workflow = StateGraph(MedicalChatState)

    workflow.add_node("agent", _agent_node)
    workflow.add_node("tools", ToolNode(TOOLS))

    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", _should_continue)
    workflow.add_edge("tools", "agent")

    _compiled_graph = workflow.compile(checkpointer=checkpointer)
    logger.info("Medical AI graph compiled successfully")
    return _compiled_graph


async def invoke_medical_agent(
    message: str,
    patient_id: str,
    chat_id: str,
    *,
    system_prompt: str | None = None,
) -> tuple[
    str,
    MealPlanPayload | None,
    FitnessPlanPayload | None,
    DifferentialDiagnosisPayload | None,
]:
    """Invoke the medical agent and return (response_text, meal_plan, fitness_plan, differential)."""
    graph = get_medical_graph()

    input_state: MedicalChatState = {
        "messages": [HumanMessage(content=message)],
        "patient_id": patient_id,
    }
    if system_prompt:
        input_state["system_prompt"] = system_prompt

    config = {"configurable": {"thread_id": chat_id}}

    result = await asyncio.to_thread(graph.invoke, input_state, config)

    all_messages = result.get("messages", [])
    meal_plan = extract_meal_plan_from_messages(all_messages)
    fitness_plan = extract_fitness_plan_from_messages(all_messages)
    differential = extract_differential_diagnosis_from_messages(all_messages)

    ai_messages = [
        m for m in all_messages
        if hasattr(m, "content") and m.type == "ai" and not getattr(m, "tool_calls", None)
    ]

    if ai_messages:
        text = _flat_text_content(ai_messages[-1].content)
        if text:
            return text, meal_plan, fitness_plan, differential
        logger.warning(
            "invoke_medical_agent: last AI message empty after normalize (chat_id=%s content_type=%s)",
            chat_id,
            type(ai_messages[-1].content).__name__,
        )
    else:
        tail = all_messages
        desc: list[str] = []
        for m in tail[-6:]:
            desc.append(
                f"{getattr(m, 'type', '?')}"
                f" tool_calls={bool(getattr(m, 'tool_calls', None))}"
                f" content_t={type(getattr(m, 'content', None)).__name__}"
            )
        logger.warning(
            "invoke_medical_agent: no non-tool AI message (chat_id=%s tail=%s)",
            chat_id,
            "; ".join(desc) if desc else "(no messages)",
        )

    return (
        "I wasn't able to generate a response. Please try again.",
        meal_plan,
        fitness_plan,
        differential,
    )


_TOOL_THINKING_UI: dict[str, tuple[str, str]] = {
    "search_patient_records": ("Searching patient records...", "records"),
    "fetch_lab_results": ("Fetching lab results...", "lab_results"),
    "web_search": ("Searching the web...", "web_search"),
    "submit_meal_plan": ("Structuring meal plan...", "meal_plan"),
    "submit_fitness_plan": ("Structuring fitness plan...", "fitness_plan"),
    "submit_differential_diagnosis": ("Building differential...", "differential"),
}


async def stream_medical_agent(
    message: str,
    patient_id: str,
    chat_id: str,
    *,
    system_prompt: str | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """Async generator that yields streaming events from the medical agent.

    Yields dicts with shape:
        {"event": "thinking",                           "data": {"status": "..."}}
        {"event": "token",                              "data": {"content": "..."}}
        {"event": "_meal_plan_payload",                 "data": {"meal_plan": {...}}}                # internal
        {"event": "_fitness_plan_payload",              "data": {"fitness_plan": {...}}}             # internal
        {"event": "_differential_diagnosis_payload",    "data": {"differential_diagnosis": {...}}}   # internal
    """
    graph = get_medical_graph()

    input_state: MedicalChatState = {
        "messages": [HumanMessage(content=message)],
        "patient_id": patient_id,
    }
    if system_prompt:
        input_state["system_prompt"] = system_prompt
    config = {"configurable": {"thread_id": chat_id}}

    settings = get_settings()
    logger.info(
        "medical_agent_stream_start chat_id=%s provider=%s message_len=%d has_custom_system=%s",
        chat_id,
        settings.LLM_PROVIDER,
        len(message or ""),
        bool(system_prompt),
    )

    stats: dict[str, int] = {
        "tokens": 0,
        "on_chat_model_stream": 0,
        "skipped_tool_chunk": 0,
        "skipped_empty_text": 0,
        "fallback_message_chunks": 0,
    }
    stream_mode = "astream_events"
    last_content_type: str | None = None
    captured_meal_plan: MealPlanPayload | None = None
    captured_fitness_plan: FitnessPlanPayload | None = None
    captured_differential: DifferentialDiagnosisPayload | None = None

    try:
        try:
            async for event in graph.astream_events(input_state, config, version="v2"):
                kind = event["event"]

                if kind == "on_tool_start":
                    name = event.get("name", "tool")
                    if name == "submit_meal_plan":
                        tool_input = event["data"].get("input", {})
                        if isinstance(tool_input, dict):
                            try:
                                captured_meal_plan = MealPlanPayload.model_validate(tool_input)
                                logger.info(
                                    "meal_plan_captured_from_stream chat_id=%s num_days=%d",
                                    chat_id,
                                    captured_meal_plan.num_days,
                                )
                            except Exception:
                                logger.warning(
                                    "meal_plan_stream_validation_failed chat_id=%s",
                                    chat_id,
                                    exc_info=True,
                                )
                    elif name == "submit_fitness_plan":
                        tool_input = event["data"].get("input", {})
                        if isinstance(tool_input, dict):
                            try:
                                captured_fitness_plan = FitnessPlanPayload.model_validate(tool_input)
                                logger.info(
                                    "fitness_plan_captured_from_stream chat_id=%s num_days=%d",
                                    chat_id,
                                    captured_fitness_plan.num_days,
                                )
                            except Exception:
                                logger.warning(
                                    "fitness_plan_stream_validation_failed chat_id=%s",
                                    chat_id,
                                    exc_info=True,
                                )
                    elif name == "submit_differential_diagnosis":
                        tool_input = event["data"].get("input", {})
                        if isinstance(tool_input, dict):
                            try:
                                captured_differential = (
                                    DifferentialDiagnosisPayload.model_validate(tool_input)
                                )
                                logger.info(
                                    "differential_captured_from_stream chat_id=%s n_diagnoses=%d",
                                    chat_id,
                                    len(captured_differential.diagnoses),
                                )
                            except Exception:
                                logger.warning(
                                    "differential_stream_validation_failed chat_id=%s",
                                    chat_id,
                                    exc_info=True,
                                )
                    if name in _TOOL_THINKING_UI:
                        status, phase = _TOOL_THINKING_UI[name]
                    else:
                        status = f"Running {name}..."
                        phase = "tool"
                    yield {
                        "event": "thinking",
                        "data": {"status": status, "phase": phase},
                    }

                elif kind == "on_tool_end":
                    yield {
                        "event": "thinking",
                        "data": {"status": "Analyzing results...", "phase": "thinking"},
                    }

                elif kind == "on_chat_model_stream":
                    stats["on_chat_model_stream"] += 1
                    chunk = event["data"].get("chunk")
                    if not chunk or not hasattr(chunk, "content"):
                        stats["skipped_empty_text"] += 1
                        continue
                    if getattr(chunk, "tool_calls", None) or getattr(
                        chunk, "tool_call_chunks", None
                    ):
                        stats["skipped_tool_chunk"] += 1
                        continue
                    last_content_type = type(chunk.content).__name__
                    text = _flat_text_content(chunk.content)
                    if not text:
                        stats["skipped_empty_text"] += 1
                        if logger.isEnabledFor(logging.DEBUG):
                            logger.debug(
                                "stream skip empty flatten content_type=%s raw_repr=%r",
                                last_content_type,
                                chunk.content,
                            )
                        continue
                    stats["tokens"] += 1
                    yield {"event": "token", "data": {"content": text}}

        except Exception as e:
            stream_mode = "astream_messages_fallback"
            logger.warning(
                "astream_events failed, falling back to astream (chat_id=%s err=%s)",
                chat_id,
                e,
                exc_info=True,
            )
            async for chunk in graph.astream(
                input_state, config, stream_mode="messages"
            ):
                stats["fallback_message_chunks"] += 1
                msg = chunk[0] if isinstance(chunk, tuple) else chunk
                if getattr(msg, "tool_calls", None) or getattr(
                    msg, "tool_call_chunks", None
                ):
                    continue
                last_content_type = type(getattr(msg, "content", None)).__name__
                text = _flat_text_content(getattr(msg, "content", None))
                if not text:
                    continue
                stats["tokens"] += 1
                yield {"event": "token", "data": {"content": text}}

    finally:
        if stats["tokens"] == 0:
            logger.warning(
                "medical_agent_empty_stream chat_id=%s provider=%s mode=%s "
                "on_chat_model_stream=%d tokens=%d skipped_tool_chunk=%d skipped_empty=%d "
                "fallback_msg_chunks=%d last_content_type=%s",
                chat_id,
                settings.LLM_PROVIDER,
                stream_mode,
                stats["on_chat_model_stream"],
                stats["tokens"],
                stats["skipped_tool_chunk"],
                stats["skipped_empty_text"],
                stats["fallback_message_chunks"],
                last_content_type,
            )

    if captured_meal_plan is not None:
        yield {
            "event": "_meal_plan_payload",
            "data": {"meal_plan": captured_meal_plan.model_dump()},
        }
    if captured_fitness_plan is not None:
        yield {
            "event": "_fitness_plan_payload",
            "data": {"fitness_plan": captured_fitness_plan.model_dump()},
        }
    if captured_differential is not None:
        yield {
            "event": "_differential_diagnosis_payload",
            "data": {"differential_diagnosis": captured_differential.model_dump()},
        }


def cleanup_graph() -> None:
    global _compiled_graph, _checkpointer, _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
    _checkpointer = None
    _compiled_graph = None
    logger.info("Graph resources cleaned up")
