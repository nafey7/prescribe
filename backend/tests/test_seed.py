"""Smoke tests for the Phase A seed script."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import seed


@pytest.mark.asyncio
async def test_seed_runs_when_collections_empty():
    """Inserts each collection once when count_documents is 0."""

    insert_many_calls: list[tuple[str, list]] = []

    def make_coll(name: str) -> AsyncMock:
        coll = AsyncMock()
        coll.count_documents = AsyncMock(return_value=0)

        async def insert_many(docs: list) -> None:
            insert_many_calls.append((name, docs))

        coll.insert_many = insert_many
        return coll

    client = MagicMock()
    db = MagicMock()
    client.__getitem__ = lambda self, _: db  # noqa: ARG005

    def get_coll(name: str) -> AsyncMock:
        return make_coll(name)

    db.__getitem__ = lambda self, name: get_coll(name)  # noqa: ARG005

    with patch("seed.AsyncIOMotorClient", return_value=client):
        with patch("seed.get_settings") as gs:
            gs.return_value = MagicMock(MONGODB_URI="mongodb://localhost", DATABASE_NAME="t")
            await seed.seed()

    names = [n for n, _ in insert_many_calls]
    assert "users" in names
    assert "patient_profiles" in names
    assert "doctor_profiles" in names
    assert "doctor_patient_links" in names
    assert "prescriptions" in names
    assert "patient_documents" in names


def test_seed_user_constants_have_expected_roles():
    roles = {u["role"] for u in seed.USERS}
    assert len(seed.USERS) >= 3
    assert roles == {seed.UserRole.PATIENT, seed.UserRole.DOCTOR, seed.UserRole.ADMIN}
