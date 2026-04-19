"""Smoke tests for the development seed script."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import seed


def test_seed_upserts_all_collections():
    """Calls replace_one(upsert) for users, connections, prescriptions, documents."""

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

    client = MagicMock()
    client.__getitem__ = lambda self, _: FakeDB()  # noqa: ARG005

    with patch("seed.AsyncIOMotorClient", return_value=client):
        with patch("seed.get_settings") as gs:
            gs.return_value = MagicMock(MONGODB_URI="mongodb://localhost", DATABASE_NAME="t")
            asyncio.run(seed.seed())

    names = [n for n, _ in replace_calls]
    assert names.count("users") == len(seed.SEED_USERS)
    assert names.count("connections") == len(seed.SEED_CONNECTIONS)
    assert names.count("prescriptions") == len(seed.SEED_PRESCRIPTIONS)
    assert names.count("patient_documents") == len(seed.SEED_PATIENT_DOCUMENTS)


def test_seed_user_constants_have_expected_roles():
    roles = {u["role"] for u in seed.SEED_USERS}
    assert len(seed.SEED_USERS) >= 3
    assert roles == {seed.UserRole.PATIENT.value, seed.UserRole.DOCTOR.value, seed.UserRole.ADMIN.value}
