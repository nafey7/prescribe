from datetime import datetime, timezone
from uuid import uuid4


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_id(prefix: str) -> str:
    """Generate a prefixed application-level ID.

    The random segment uses ``uuid4().hex[:12]`` (48 bits of entropy). For a
    given prefix, expect roughly 1% collision probability near ~2.4M records
    (birthday bound); fine for development, but review capacity if IDs are
    generated at very high volume in production.

    Examples: usr_a1b2c3, pat_d4e5f6, dr_g7h8i9, docu_j0k1l2
    """
    short = uuid4().hex[:12]
    return f"{prefix}_{short}"


def user_id() -> str:
    return generate_id("usr")


def patient_id() -> str:
    return generate_id("pat")


def doctor_id() -> str:
    return generate_id("dr")


def link_id() -> str:
    return generate_id("lnk")


def prescription_id() -> str:
    return generate_id("rx")


def document_id() -> str:
    return generate_id("docu")


def chat_id() -> str:
    return generate_id("chat")


def message_id() -> str:
    return generate_id("msg")
