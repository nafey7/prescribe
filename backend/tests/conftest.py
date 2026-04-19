"""Pytest configuration. Run tests via the backend container (see backend/CLAUDE.md)."""

import os

# Ensure app can start before auth-related env is set in individual tests.
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production")
os.environ.setdefault("AUTH_REQUIRED", "false")
