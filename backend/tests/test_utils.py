"""Unit tests for app.utils."""

from datetime import timezone

from app import utils


def test_utcnow_is_timezone_aware_utc():
    t = utils.utcnow()
    assert t.tzinfo is not None
    assert t.utcoffset() == timezone.utc.utcoffset(t)


def test_generate_id_format():
    gid = utils.generate_id("pfx")
    assert gid.startswith("pfx_")
    assert len(gid) == len("pfx_") + 12


def test_id_generators_use_expected_prefixes():
    assert utils.user_id().startswith("usr_")
    assert utils.patient_id().startswith("pat_")
    assert utils.doctor_id().startswith("dr_")
    assert utils.document_id().startswith("docu_")
    assert utils.link_id().startswith("lnk_")
    assert utils.prescription_id().startswith("rx_")
    assert utils.chat_id().startswith("chat_")
    assert utils.message_id().startswith("msg_")


def test_generate_id_uniqueness():
    seen = {utils.generate_id("t") for _ in range(500)}
    assert len(seen) == 500
