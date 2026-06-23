"""Regression tests for LangGraph isolation, lifecycle, and turn-scoping rules."""

from typing import Annotated, TypedDict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.ai.graph import _messages_from_turn, delete_medical_thread
from app.ai.tools import (
    fetch_lab_results,
    search_patient_documents,
    search_patient_records,
    web_search,
)
from app.repository import chat as chat_repo
from app.service.chat import process_message


def test_patient_scope_is_hidden_from_all_model_tool_schemas():
    for tool in (
        fetch_lab_results,
        search_patient_documents,
        search_patient_records,
        web_search,
    ):
        schema = tool.tool_call_schema.model_json_schema()
        assert "patient_id" not in schema.get("properties", {})


def test_tool_node_overwrites_model_supplied_patient_id_with_authorized_state():
    class State(TypedDict):
        messages: Annotated[list, add_messages]
        patient_id: str

    builder = StateGraph(State)
    builder.add_node("tools", ToolNode([fetch_lab_results]))
    builder.set_entry_point("tools")
    graph = builder.compile()

    db = MagicMock()
    db.users.find_one.return_value = {"user_id": "authorized-patient"}
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.__iter__ = MagicMock(return_value=iter([]))
    db.suggestions.find.return_value = cursor
    malicious_call = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "fetch_lab_results",
                "args": {"patient_id": "different-patient"},
                "id": "call-1",
                "type": "tool_call",
            }
        ],
    )

    with patch("app.ai.tools._get_sync_db", return_value=db):
        graph.invoke(
            {"messages": [malicious_call], "patient_id": "authorized-patient"}
        )

    db.suggestions.find.assert_called_once_with(
        {"patient_id": "authorized-patient", "category": "lab_result"}
    )


def test_messages_from_turn_excludes_historical_structured_calls():
    old_plan = AIMessage(
        content="",
        tool_calls=[
            {"name": "submit_meal_plan", "args": {}, "id": "old-call"}
        ],
    )
    current = HumanMessage(content="hello", id="current-turn")
    reply = AIMessage(content="Hello", id="current-reply")

    assert _messages_from_turn([old_plan, current, reply], "current-turn") == [
        current,
        reply,
    ]


def test_document_retrieval_is_scoped_and_marks_content_untrusted():
    db = MagicMock()
    db.users.find_one.return_value = {"user_id": "authorized-patient"}
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.__iter__ = MagicMock(
        return_value=iter(
            [
                {
                    "document_id": "doc-1",
                    "patient_id": "authorized-patient",
                    "filename": "report.pdf",
                    "extracted_text": "Clinical finding: stable.",
                }
            ]
        )
    )
    db.documents.find.return_value = cursor

    with patch("app.ai.tools._get_sync_db", return_value=db):
        result = search_patient_documents.invoke(
            {"patient_id": "authorized-patient", "query": "clinical"}
        )

    db.documents.find.assert_called_once_with({"patient_id": "authorized-patient"})
    assert "untrusted patient-document data" in result
    assert "#citation-document-doc-1" in result
    assert "Clinical finding: stable." in result


@pytest.mark.asyncio
async def test_delete_medical_thread_removes_checkpoint_state():
    checkpointer = MagicMock()
    with patch("app.ai.graph._get_checkpointer", return_value=checkpointer):
        await delete_medical_thread("chat-1")
    checkpointer.delete_thread.assert_called_once_with("chat-1")


@pytest.mark.asyncio
async def test_client_cannot_recreate_missing_chat_id():
    db = MagicMock()
    with patch.object(chat_repo, "get_session", new=AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc:
            await process_message("hello", "deleted-chat", "patient-1", db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_failed_ai_turn_marks_user_message_failed():
    db = MagicMock()
    with (
        patch.object(
            chat_repo,
            "get_session",
            new=AsyncMock(return_value={"chat_id": "c1", "patient_id": "p1"}),
        ),
        patch.object(chat_repo, "count_messages", new=AsyncMock(return_value=1)),
        patch.object(chat_repo, "acquire_turn", new=AsyncMock(return_value=True)),
        patch.object(chat_repo, "release_turn", new=AsyncMock()),
        patch.object(chat_repo, "save_message", new=AsyncMock(return_value="m1")),
        patch.object(chat_repo, "update_message_status", new=AsyncMock()) as update,
        patch("app.service.chat.invoke_medical_agent", new=AsyncMock(side_effect=RuntimeError("boom"))),
    ):
        with pytest.raises(RuntimeError, match="boom"):
            await process_message("hello", "c1", "p1", db)

    update.assert_awaited_once_with(db, "c1", "m1", "failed")


@pytest.mark.asyncio
async def test_busy_chat_rejects_concurrent_graph_run():
    db = MagicMock()
    with (
        patch.object(
            chat_repo,
            "get_session",
            new=AsyncMock(return_value={"chat_id": "c1", "patient_id": "p1"}),
        ),
        patch.object(chat_repo, "count_messages", new=AsyncMock(return_value=1)),
        patch.object(chat_repo, "acquire_turn", new=AsyncMock(return_value=False)),
    ):
        with pytest.raises(HTTPException) as exc:
            await process_message("hello", "c1", "p1", db)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_chat_history_fetches_latest_page_in_chronological_order():
    db = MagicMock()
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(
        return_value=[{"message_id": "new"}, {"message_id": "old"}]
    )
    db.chat_messages.find.return_value = cursor

    rows = await chat_repo.get_messages(db, "c1", limit=2)

    cursor.sort.assert_called_once_with("timestamp", -1)
    assert [row["message_id"] for row in rows] == ["old", "new"]


@pytest.mark.asyncio
async def test_chat_turn_lease_is_atomic_and_owner_scoped():
    db = MagicMock()
    db.chat_sessions.find_one_and_update = AsyncMock(return_value={"_id": "mongo"})
    db.chat_sessions.update_one = AsyncMock()

    assert await chat_repo.acquire_turn(db, "c1", "turn-1") is True
    acquire_filter = db.chat_sessions.find_one_and_update.await_args.args[0]
    assert acquire_filter["chat_id"] == "c1"
    assert "$or" in acquire_filter

    await chat_repo.release_turn(db, "c1", "turn-1")
    release_filter = db.chat_sessions.update_one.await_args.args[0]
    assert release_filter == {"chat_id": "c1", "active_turn_id": "turn-1"}
