"""Tests for refresh_tokens repository (indexes + revoke helpers)."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from pymongo import ASCENDING

from app.repository import refresh_tokens


@pytest.mark.asyncio
async def test_ensure_indexes_creates_ttl_and_compound():
    coll = AsyncMock()
    coll.create_index = AsyncMock()

    db = MagicMock()
    db.__getitem__ = lambda self, name: coll  # noqa: ARG005

    await refresh_tokens.ensure_indexes(db)

    assert coll.create_index.await_count == 2
    calls = coll.create_index.await_args_list
    ttl_call = calls[0][0]
    compound_call = calls[1][0]
    assert ttl_call[0] == [("expires_at", ASCENDING)]
    assert calls[0].kwargs.get("expireAfterSeconds") == 0
    assert compound_call[0] == [("user_id", ASCENDING), ("family_id", ASCENDING)]


@pytest.mark.asyncio
async def test_revoke_active_token_updates_only_unrevoked_row():
    coll = AsyncMock()
    coll.find_one_and_update = AsyncMock(
        return_value={"_id": "jti-1", "revoked_at": "set"}
    )
    db = MagicMock()
    db.__getitem__ = lambda self, name: coll  # noqa: ARG005

    out = await refresh_tokens.revoke_active_token(
        db, jti="jti-1", user_id="u1", replaced_by_jti="jti-2"
    )
    assert out is not None
    coll.find_one_and_update.assert_awaited_once()
    filt = coll.find_one_and_update.await_args[0][0]
    assert filt["_id"] == "jti-1"
    assert filt["user_id"] == "u1"
    assert filt["revoked_at"] is None


@pytest.mark.asyncio
async def test_revoke_family_updates_matching_rows():
    coll = AsyncMock()
    coll.update_many = AsyncMock(return_value=MagicMock(modified_count=3))
    db = MagicMock()
    db.__getitem__ = lambda self, name: coll  # noqa: ARG005

    n = await refresh_tokens.revoke_family(db, "u1", "fam-1")
    assert n == 3
    coll.update_many.assert_awaited_once()
    filt = coll.update_many.await_args[0][0]
    assert filt["user_id"] == "u1"
    assert filt["family_id"] == "fam-1"


@pytest.mark.asyncio
async def test_revoke_all_for_user_updates_by_user_id():
    coll = AsyncMock()
    coll.update_many = AsyncMock(return_value=MagicMock(modified_count=4))
    db = MagicMock()
    db.__getitem__ = lambda self, name: coll  # noqa: ARG005

    n = await refresh_tokens.revoke_all_for_user(db, "u1")
    assert n == 4
    filt = coll.update_many.await_args[0][0]
    assert filt == {"user_id": "u1"}
