"""
Set bcrypt password hashes on every user in MongoDB for local development.

Requires DEV_DEFAULT_PASSWORD (same strength rules as signup). Safe to run repeatedly:
each run overwrites password_hash for all users.

Optional per-user override: set an env var derived from the user's email — uppercase,
non-alphanumeric sequences collapsed to a single underscore — prefixed with DEV_PASSWORD_.
Example: jane@example.com → DEV_PASSWORD_JANE_EXAMPLE_COM.

Usage (Docker, from repo root):

    docker compose exec -e DEV_DEFAULT_PASSWORD='your-8+-char-password' backend \\
      python -m app.scripts.set_dev_passwords

With local Mongo (backend cwd, venv active):

    DEV_DEFAULT_PASSWORD='your-8+-char-password' python -m app.scripts.set_dev_passwords
"""

from __future__ import annotations

import asyncio
import os
import re
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings
from app.repository import users as users_repo
from app.schemas.auth import validate_password_strength
from app.service.auth import hash_password


def _dev_password_override_env_name(email: str) -> str:
    safe = re.sub(r"[^A-Z0-9]+", "_", email.upper()).strip("_")
    return f"DEV_PASSWORD_{safe}"


def _resolve_plain_password(email: str, default: str) -> str:
    key = _dev_password_override_env_name(email)
    return os.environ.get(key, default)


async def _run() -> int:
    default_raw = os.environ.get("DEV_DEFAULT_PASSWORD")
    if not default_raw:
        print(
            "DEV_DEFAULT_PASSWORD is required (min 8 chars, letter + digit; see signup policy).",
            file=sys.stderr,
        )
        return 1

    try:
        validate_password_strength(default_raw)
    except ValueError as exc:
        print(f"DEV_DEFAULT_PASSWORD invalid: {exc}", file=sys.stderr)
        return 1

    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    cursor = db.users.find({}, {"user_id": 1, "email": 1})
    docs = await cursor.to_list(length=None)

    if not docs:
        print("No users in database; nothing to do.")
        client.close()
        return 0

    rounds = settings.BCRYPT_ROUNDS
    updated = 0

    for doc in docs:
        user_id = doc.get("user_id")
        email = doc.get("email")
        if not user_id or not email:
            print(f"  skip: missing user_id or email on doc {doc.get('_id')}", file=sys.stderr)
            continue
        plain = _resolve_plain_password(str(email), default_raw)
        try:
            validate_password_strength(plain)
        except ValueError as exc:
            print(
                f"  skip {email}: password invalid ({exc}); fix {_dev_password_override_env_name(str(email))} or DEV_DEFAULT_PASSWORD",
                file=sys.stderr,
            )
            continue
        pwd_hash = hash_password(plain, rounds=rounds)
        await users_repo.set_password_hash(db, user_id, pwd_hash)
        print(f"  ✓  {email} ({user_id})")
        updated += 1

    client.close()
    print(f"\nUpdated {updated} user(s).")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    print("Setting dev password hashes…\n")
    main()
