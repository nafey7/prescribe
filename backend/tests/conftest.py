"""Pytest configuration. Run tests via the backend container (see backend/CLAUDE.md)."""

import os

# Ensure app can start before auth-related env is set in individual tests.
# Force (not setdefault): Docker `.env` may set AUTH_REQUIRED=true / ENVIRONMENT=production,
# which breaks `auth_bypass_allowed()` and tests that rely on dev bypass.
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production")
os.environ["AUTH_REQUIRED"] = "false"
os.environ["ENVIRONMENT"] = "test"

from app.config import get_settings

get_settings.cache_clear()
