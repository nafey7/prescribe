"""Unit tests for fitness_plan_share repository (indexes + CRUD helpers)."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from pymongo import ASCENDING, DESCENDING

from app.repository import fitness_plan_share


def _mock_db(collection: AsyncMock) -> MagicMock:
    db = MagicMock()
    db.__getitem__ = lambda self, name: collection  # noqa: ARG005
    setattr(db, fitness_plan_share.COLLECTION, collection)
    return db


@pytest.mark.asyncio
async def test_ensure_indexes_creates_three_indexes():
    coll = AsyncMock()
    coll.create_index = AsyncMock()

    db = _mock_db(coll)
    await fitness_plan_share.ensure_indexes(db)

    assert coll.create_index.await_count == 3
    calls = coll.create_index.await_args_list
    assert calls[0][0][0] == [("share_id", ASCENDING)]
    assert calls[0].kwargs.get("unique") is True
    assert calls[1][0][0] == [("patient_id", ASCENDING), ("created_at", DESCENDING)]
    assert calls[2][0][0] == [("patient_id", ASCENDING), ("source_message_id", ASCENDING)]
    assert calls[2].kwargs.get("unique") is True
    assert calls[2].kwargs.get("partialFilterExpression") == {"revoked_at": None}


@pytest.mark.asyncio
async def test_insert_share_returns_without_internal_id():
    coll = AsyncMock()
    coll.insert_one = AsyncMock()

    db = _mock_db(coll)
    now = datetime.now(timezone.utc)
    doc = {
        "share_id": str(uuid4()),
        "patient_id": "pat_1",
        "doctor_id": "dr_1",
        "fitness_plan": {
            "num_days": 1,
            "goal": "Test",
            "fitness_level": "beginner",
            "days": [],
            "summary": "",
            "disclaimer": "x",
        },
        "source_chat_id": "chat_1",
        "source_message_id": "msg_1",
        "chat_title": None,
        "created_at": now,
        "revoked_at": None,
    }
    out = await fitness_plan_share.insert_share(db, doc)
    assert "_id" not in out
    assert out["share_id"] == doc["share_id"]
    coll.insert_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_find_by_patient_sorts_and_paginates():
    coll = AsyncMock()
    chain = MagicMock()
    coll.find = MagicMock(return_value=chain)
    chain.sort = MagicMock(return_value=chain)
    chain.skip = MagicMock(return_value=chain)
    chain.limit = MagicMock(return_value=chain)
    chain.to_list = AsyncMock(
        return_value=[
            {"share_id": "s1", "patient_id": "p1", "_id": "oid"},
        ]
    )

    db = _mock_db(coll)
    rows = await fitness_plan_share.find_by_patient(db, "p1", skip=5, limit=10)

    coll.find.assert_called_once_with({"patient_id": "p1", "revoked_at": None})
    chain.sort.assert_called_once_with("created_at", DESCENDING)
    chain.skip.assert_called_once_with(5)
    chain.limit.assert_called_once_with(10)
    assert rows == [{"share_id": "s1", "patient_id": "p1"}]


@pytest.mark.asyncio
async def test_get_by_share_id_optional_patient_scope():
    coll = AsyncMock()
    coll.find_one = AsyncMock(return_value={"share_id": "s1", "_id": 1})

    db = _mock_db(coll)
    row = await fitness_plan_share.get_by_share_id(db, "s1", patient_id="p1")
    assert row == {"share_id": "s1"}
    coll.find_one.assert_awaited_once_with({"share_id": "s1", "patient_id": "p1"})


@pytest.mark.asyncio
async def test_find_by_message_active_only():
    coll = AsyncMock()
    coll.find_one = AsyncMock(return_value=None)

    db = _mock_db(coll)
    await fitness_plan_share.find_by_message(db, "p1", "msg_99")
    coll.find_one.assert_awaited_once_with(
        {
            "patient_id": "p1",
            "source_message_id": "msg_99",
            "revoked_at": None,
        }
    )


@pytest.mark.asyncio
async def test_get_by_share_id_no_patient_scope():
    coll = AsyncMock()
    coll.find_one = AsyncMock(return_value={"share_id": "s2", "_id": 2})

    db = _mock_db(coll)
    row = await fitness_plan_share.get_by_share_id(db, "s2")
    assert row == {"share_id": "s2"}
    coll.find_one.assert_awaited_once_with({"share_id": "s2"})
