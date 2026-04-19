"""
Shared identifiers and matchers for dev seed / deseed scripts.

Stable UUIDs keep `python -m seed` idempotent: the same logical user always
gets the same `user_id` across runs.
"""

from __future__ import annotations

import uuid
from typing import Final

# Stored on seeded rows in `connections`, `prescriptions`, `patient_documents`.
SEED_SOURCE_TAG: Final[str] = "prescribe_dev"

_NAMESPACE = uuid.UUID("0198a000-0000-7000-8000-000000000001")


def stable_seed_uuid(part: str) -> str:
    return str(uuid.uuid5(_NAMESPACE, part))


# ---------------------------------------------------------------------------
# Emails removed by deseed (lowercased)
# ---------------------------------------------------------------------------

# Primary demo users from `seed.py` (Phase A examples).
PHASE_A_USER_EMAILS: Final[frozenset[str]] = frozenset(
    {
        "john.doe@example.com",
        "jane.smith@example.com",
        "alex.kumar@example.com",
        "dr.sarah.ahmed@example.com",
        "dr.omar.khan@example.com",
        "admin@prescribe.local",
    }
)

# Doctors inserted by `scripts/seed_doctors.py`.
SEED_DOCTORS_SCRIPT_EMAILS: Final[frozenset[str]] = frozenset(
    {
        "sarah.chen@example.com",
        "michael.rivera@example.com",
    }
)

PATIENT_MARKDOWN_SEED_DOMAIN: Final[str] = "patients.seed.local"


def is_seed_patient_markdown_email(email: str) -> bool:
    e = email.strip().lower()
    return e.endswith(f"@{PATIENT_MARKDOWN_SEED_DOMAIN}")


def all_known_seed_emails() -> frozenset[str]:
    return PHASE_A_USER_EMAILS | SEED_DOCTORS_SCRIPT_EMAILS
