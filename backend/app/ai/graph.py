import asyncio
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode
from pymongo import MongoClient

from app.ai.llm import get_llm
from app.ai.prompts import MEDICAL_SYSTEM_PROMPT_TEMPLATE
from app.ai.state import MedicalChatState
from app.ai.tools import search_patient_records
from app.config import get_settings

logger = logging.getLogger(__name__)

_compiled_graph = None
_checkpointer = None
_mongo_client: MongoClient | None = None

TOOLS = [search_patient_records]


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
    system_prompt = MEDICAL_SYSTEM_PROMPT_TEMPLATE.format(patient_id=patient_id)

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
) -> str:
    graph = get_medical_graph()

    input_state: MedicalChatState = {
        "messages": [HumanMessage(content=message)],
        "patient_id": patient_id,
    }

    config = {"configurable": {"thread_id": chat_id}}

    result = await asyncio.to_thread(graph.invoke, input_state, config)

    ai_messages = [
        m for m in result["messages"]
        if hasattr(m, "content") and m.type == "ai" and not getattr(m, "tool_calls", None)
    ]

    if ai_messages:
        return ai_messages[-1].content

    return "I wasn't able to generate a response. Please try again."


def cleanup_graph() -> None:
    global _compiled_graph, _checkpointer, _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
    _checkpointer = None
    _compiled_graph = None
    logger.info("Graph resources cleaned up")
