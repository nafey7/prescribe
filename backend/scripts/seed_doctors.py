#!/usr/bin/env python3
"""Insert seed doctor rows into MongoDB `users` (role=doctor) for dev identity.

Run from repo root with backend on PYTHONPATH, or from `backend/`:

  cd backend && PYTHONPATH=. python scripts/seed_doctors.py

Requires MONGODB_URI and DATABASE_NAME (defaults match docker-compose).
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.config import get_settings  # noqa: E402
from app.database.connection import close_mongodb, connect_to_mongodb, get_database  # noqa: E402

SEED_DOCTORS: list[dict] = [
    {
        "email": "sarah.chen@example.com",
        "doctor_profile": {
            "first_name": "Sarah",
            "last_name": "Chen",
            "title": "Dr.",
            "specialization": "Internal Medicine",
            "sub_specializations": ["Endocrinology"],
            "license_number": "MD-2015-CA-78432",
            "license_state": "CA",
            "npi_number": "1234567890",
            "institution": "Bay Area Medical Center",
            "department": "Internal Medicine",
            "years_of_experience": 11,
            "education": [
                {
                    "degree": "MD",
                    "institution": "Stanford University School of Medicine",
                    "year": 2015,
                },
                {
                    "degree": "Residency, Internal Medicine",
                    "institution": "UCSF Medical Center",
                    "year": 2018,
                },
            ],
            "phone": "+1-555-0200",
            "office_address": {
                "street": "100 Medical Plaza",
                "city": "San Francisco",
                "state": "CA",
                "zip": "94102",
            },
            "accepting_new_patients": True,
            "bio": (
                "Board-certified internist with a focus on chronic disease management "
                "and preventive care."
            ),
        },
    },
    {
        "email": "michael.rivera@example.com",
        "doctor_profile": {
            "first_name": "Michael",
            "last_name": "Rivera",
            "title": "Dr.",
            "specialization": "Cardiology",
            "sub_specializations": [],
            "license_number": "MD-2012-NY-56291",
            "license_state": "NY",
            "npi_number": "0987654321",
            "institution": "City Heart Institute",
            "department": "Cardiology",
            "years_of_experience": 14,
            "education": [
                {
                    "degree": "MD",
                    "institution": "Johns Hopkins University School of Medicine",
                    "year": 2012,
                },
                {
                    "degree": "Fellowship, Cardiology",
                    "institution": "Mayo Clinic",
                    "year": 2016,
                },
            ],
            "phone": "+1-555-0300",
            "office_address": {
                "street": "200 Cardiac Way",
                "city": "New York",
                "state": "NY",
                "zip": "10001",
            },
            "accepting_new_patients": True,
            "bio": "Interventional cardiologist focused on heart failure and prevention.",
        },
    },
]


async def main() -> None:
    _ = get_settings()
    await connect_to_mongodb()
    db = get_database()
    now = datetime.now(timezone.utc)

    for row in SEED_DOCTORS:
        email = row["email"].lower().strip()
        existing = await db.users.find_one({"email": email, "role": "doctor"})
        if existing:
            print(f"Skip (exists): {email} → user_id={existing.get('user_id')}")
            continue

        user_id = str(uuid4())
        doc = {
            "user_id": user_id,
            "role": "doctor",
            "email": email,
            "created_at": now,
            "updated_at": now,
            "doctor_profile": row["doctor_profile"],
        }
        await db.users.insert_one(doc)
        print(f"Seeded: {email} → user_id={user_id}")

    await close_mongodb()


if __name__ == "__main__":
    asyncio.run(main())
