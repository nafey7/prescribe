"""Repository layer tests (async mocks + behavior contracts)."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId
from pymongo import ReturnDocument

from app.repository import doctor, documents, patients, prescriptions, relationships, users
from app.schemas.enums import LinkRequestedBy, LinkStatus, PrescriptionStatus, UserRole
from app.schemas.patient import PhaseAPatientProfileCreate
from app.schemas.prescription import Medication, PrescriptionCreate
from app.schemas.relationship import DoctorPatientLinkCreate
from app.schemas.user import UserCreate


def _fake_db(collection: AsyncMock, *, collection_attr: str = "users") -> MagicMock:
    """Motor exposes collections as attributes (e.g. db.users), not only db['users']."""
    db = MagicMock()
    db.__getitem__ = lambda self, name: collection  # noqa: ARG005
    setattr(db, collection_attr, collection)
    return db


@pytest.mark.asyncio
async def test_create_user_strips_mongodb_id():
    coll = AsyncMock()

    async def insert_one(doc: dict) -> None:
        doc["_id"] = ObjectId()

    coll.insert_one = AsyncMock(side_effect=insert_one)

    db = _fake_db(coll)
    payload = UserCreate(role=UserRole.ADMIN, email="admin@example.com")
    result = await users.create_user(db, payload)

    assert "_id" not in result
    assert result["email"] == "admin@example.com"
    coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_by_id_uses_public_projection():
    coll = AsyncMock()
    coll.find_one = AsyncMock(
        return_value={"user_id": "u1", "email": "a@b.com", "role": UserRole.PATIENT}
    )
    db = _fake_db(coll)
    await users.get_user_by_id(db, "u1")
    coll.find_one.assert_called_once()
    args = coll.find_one.call_args[0]
    assert args[1] == users._USER_PUBLIC_PROJECTION


@pytest.mark.asyncio
async def test_get_user_by_email_with_password_hash_includes_hash():
    coll = AsyncMock()
    coll.find_one = AsyncMock(
        return_value={
            "email": "a@b.com",
            "password_hash": "secret",
        }
    )
    db = _fake_db(coll)
    out = await users.get_user_by_email_with_password_hash(db, "a@b.com")
    assert out is not None
    assert out.get("password_hash") == "secret"


@pytest.mark.asyncio
async def test_update_user_does_not_mutate_caller_dict():
    coll = AsyncMock()
    coll.find_one_and_update = AsyncMock(
        return_value={"user_id": "u1", "profile_completed": True}
    )
    db = _fake_db(coll)
    updates = {"profile_completed": True}
    await users.update_user(db, "u1", updates)
    assert "updated_at" not in updates
    args, call_kw = coll.find_one_and_update.call_args
    assert "updated_at" in args[1]["$set"]
    assert call_kw["return_document"] == ReturnDocument.AFTER


@pytest.mark.asyncio
async def test_create_patient_profile_uses_exclude_none():
    coll = AsyncMock()

    async def insert_one(doc: dict) -> None:
        doc["_id"] = ObjectId()

    coll.insert_one = AsyncMock(side_effect=insert_one)
    db = _fake_db(coll, collection_attr="patient_profiles")
    payload = PhaseAPatientProfileCreate(
        user_id="usr_1",
        full_name="Jane",
        gender=None,
    )
    result = await patients.create_profile(db, payload)
    assert "_id" not in result
    assert result["full_name"] == "Jane"


@pytest.mark.asyncio
async def test_create_link_uses_enum_for_patient_request():
    coll = AsyncMock()

    async def insert_one(doc: dict) -> None:
        doc["_id"] = ObjectId()

    coll.insert_one = AsyncMock(side_effect=insert_one)
    db = _fake_db(coll, collection_attr="doctor_patient_links")
    payload = DoctorPatientLinkCreate(
        patient_id="pat_x",
        doctor_id="dr_y",
        requested_by=LinkRequestedBy.PATIENT,
    )
    result = await relationships.create_link(db, payload)
    assert result["status"] == LinkStatus.PENDING_PATIENT_REQUEST


@pytest.mark.asyncio
async def test_create_prescription_strips_id():
    coll = AsyncMock()

    async def insert_one(doc: dict) -> None:
        doc["_id"] = ObjectId()

    coll.insert_one = AsyncMock(side_effect=insert_one)
    db = _fake_db(coll, collection_attr="prescriptions")
    payload = PrescriptionCreate(
        patient_id="pat_a",
        doctor_id="dr_b",
        created_by_user_id="usr_c",
        medications=[Medication(name="Med")],
    )
    result = await prescriptions.create_prescription(db, payload)
    assert "_id" not in result


@pytest.mark.asyncio
async def test_update_prescription_status_uses_return_document_after():
    coll = AsyncMock()
    coll.find_one_and_update = AsyncMock(return_value={"prescription_id": "rx_1"})
    db = _fake_db(coll, collection_attr="prescriptions")
    await prescriptions.update_prescription_status(
        db, "rx_1", PrescriptionStatus.CANCELLED
    )
    kw = coll.find_one_and_update.call_args.kwargs
    assert kw["return_document"] == ReturnDocument.AFTER


@pytest.mark.asyncio
async def test_doctor_update_does_not_mutate_profile_dict():
    coll = AsyncMock()
    coll.find_one_and_update = AsyncMock(
        return_value={"user_id": "u1", "role": "doctor"}
    )
    db = _fake_db(coll, collection_attr="users")
    prof = {"bio": "x"}
    await doctor.update_doctor(db, "u1", prof, None)
    assert "updated_at" not in prof


@pytest.mark.asyncio
async def test_document_update_does_not_mutate_updates():
    coll = AsyncMock()
    coll.find_one_and_update = AsyncMock(return_value={"document_id": "docu_1"})
    db = _fake_db(coll, collection_attr="patient_documents")
    u = {"title": "Lab"}
    await documents.update_document(db, "docu_1", u)
    assert "updated_at" not in u
