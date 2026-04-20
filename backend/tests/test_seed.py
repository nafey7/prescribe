"""Smoke tests for the development seed script."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import seed


def _fake_db(
    *,
    seed_user_count: int,
) -> MagicMock:
    """``seed_user_count`` is the result of users.count_documents for seed ids."""
    replace_calls: list[tuple[str, dict]] = []

    def make_coll(name: str) -> AsyncMock:
        coll = AsyncMock()

        async def replace_one(filter_q: dict, doc: dict, upsert: bool = False):
            assert upsert is True
            replace_calls.append((name, doc))
            mock_result = MagicMock()
            mock_result.upserted_id = None
            return mock_result

        coll.replace_one = replace_one
        return coll

    collections: dict[str, AsyncMock] = {}

    class FakeDB:
        def __getattr__(self, name: str) -> AsyncMock:
            if name not in collections:
                collections[name] = make_coll(name)
            return collections[name]

    db = FakeDB()

    async def count_documents(_filter: dict) -> int:
        return seed_user_count

    db.users.count_documents = count_documents  # type: ignore[method-assign]

    client = MagicMock()
    client.__getitem__ = lambda self, _: db  # noqa: ARG005
    return client, replace_calls


def test_seed_upserts_all_collections_when_not_complete(monkeypatch):
    """Calls replace_one(upsert) when seed users are missing."""

    monkeypatch.setenv("DEV_DEFAULT_PASSWORD", "ValidPass1Here")

    client, replace_calls = _fake_db(seed_user_count=0)

    with patch("seed.AsyncIOMotorClient", return_value=client):
        with patch("seed.get_settings") as gs:
            gs.return_value = MagicMock(
                MONGODB_URI="mongodb://localhost",
                DATABASE_NAME="t",
                BCRYPT_ROUNDS=4,
            )
            out = asyncio.run(seed.seed())
            assert out is True

    names = [n for n, _ in replace_calls]
    assert names.count("users") == len(seed.SEED_USERS)
    assert names.count("connections") == len(seed.SEED_CONNECTIONS)
    assert names.count("prescriptions") == len(seed.SEED_PRESCRIPTIONS)
    assert names.count("patient_documents") == len(seed.SEED_PATIENT_DOCUMENTS)


def test_seed_skips_when_all_seed_users_present(monkeypatch):
    monkeypatch.setenv("DEV_DEFAULT_PASSWORD", "ValidPass1Here")

    client, replace_calls = _fake_db(seed_user_count=len(seed.ALL_SEED_USER_IDS))

    with patch("seed.AsyncIOMotorClient", return_value=client):
        with patch("seed.get_settings") as gs:
            gs.return_value = MagicMock(
                MONGODB_URI="mongodb://localhost",
                DATABASE_NAME="t",
                BCRYPT_ROUNDS=4,
            )
            out = asyncio.run(seed.seed())
            assert out is False

    assert replace_calls == []


def test_seed_startup_mode_skips_without_password(monkeypatch):
    monkeypatch.delenv("DEV_DEFAULT_PASSWORD", raising=False)

    with patch("seed.get_settings") as gs:
        gs.return_value = MagicMock(
            MONGODB_URI="mongodb://localhost",
            DATABASE_NAME="t",
            BCRYPT_ROUNDS=4,
        )
        out = asyncio.run(seed.seed(require_dev_password=False))
        assert out is False


def test_seed_user_constants_have_expected_roles():
    roles = {u["role"] for u in seed.SEED_USERS}
    assert len(seed.SEED_USERS) >= 3
    assert roles == {seed.UserRole.PATIENT.value, seed.UserRole.DOCTOR.value, seed.UserRole.ADMIN.value}
