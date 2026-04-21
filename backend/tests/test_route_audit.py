"""Fail if a new HTTP API route accepts unauthenticated requests without an explicit allow-list."""

from __future__ import annotations

import uuid

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

PUBLIC_METHOD_PATHS: set[tuple[str, str]] = {
    ("GET", "/health"),
    ("POST", "/api/auth/signup"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/refresh"),
    ("POST", "/api/auth/logout"),
    ("GET", "/api/config/features"),
}


def _fill_path(path: str) -> str:
    return (
        path.replace("{chat_id}", "chat_route_audit_1")
        .replace("{patient_id}", "pat_route_audit_1")
        .replace("{doctor_id}", "usr_route_audit_doc")
        .replace("{connection_id}", "conn_route_audit_1")
        .replace("{document_id}", "doc_route_audit_1")
        .replace("{suggestion_id}", "sug_route_audit_1")
        .replace("{share_id}", "share_route_audit_1")
    )


def _url_for_route_audit(method: str, route_path: str, filled_path: str) -> str:
    if method == "GET" and "meal-plan/pdf" in route_path and "/chat/meal-plan/pdf" in route_path:
        sep = "&" if "?" in filled_path else "?"
        return f"{filled_path}{sep}chat_id=chat_route_audit_1&message_id=msg_route_audit_1"
    return filled_path


def _json_body(method: str, path: str) -> dict | None:
    if method != "POST":
        return None
    if path in (
        "/api/auth/signup",
        "/api/auth/login",
        "/api/auth/refresh",
        "/api/auth/logout",
    ):
        return None
    if path == "/api/patients/{patient_id}/documents":
        return None
    if "/chat/message" in path:
        return {"message": "route-audit", "chat_id": None}
    if path == "/api/patients":
        return {
            "first_name": "Route",
            "last_name": "Audit",
            "email": f"route_audit_{uuid.uuid4().hex}@example.com",
        }
    if path == "/api/doctors":
        return {
            "first_name": "Route",
            "last_name": "Audit",
            "email": f"route_audit_dr_{uuid.uuid4().hex}@example.com",
            "specialization": "Internal Medicine",
        }
    if path == "/api/connections/request":
        return {
            "doctor_id": "usr_route_audit_d",
            "patient_id": "pat_route_audit_p",
            "initiated_by": "patient",
        }
    if path.endswith("/suggestions/accept-all") or path.endswith(
        "/suggestions/reject-all"
    ):
        return None
    if path.endswith("/meal-plan-shares") and "/doctors/" in path:
        return {
            "chat_id": "chat_route_audit_1",
            "message_id": "msg_route_audit_1",
        }
    return None


@pytest.fixture
def route_audit_env(monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("JWT_SECRET", "route-audit-test-secret-key-32b!")
    monkeypatch.setenv("BCRYPT_ROUNDS", "4")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_all_api_routes_require_authentication(route_audit_env):
    with TestClient(app, raise_server_exceptions=False) as client:
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            filled = _fill_path(route.path)
            for method in route.methods - {"HEAD", "OPTIONS"}:
                if (method, route.path) in PUBLIC_METHOD_PATHS:
                    continue
                kwargs: dict = {}
                if (
                    method == "POST"
                    and route.path == "/api/patients/{patient_id}/documents"
                ):
                    kwargs["files"] = {
                        "file": ("audit.txt", b"x", "text/plain"),
                    }
                    kwargs["data"] = {"category": "other", "description": ""}
                else:
                    body = _json_body(method, route.path)
                    if body is not None:
                        kwargs["json"] = body
                url = _url_for_route_audit(method, route.path, filled)
                resp = client.request(method, url, **kwargs)
                assert resp.status_code in (
                    401,
                    403,
                    405,
                ), (
                    f"{method} {route.path} returned {resp.status_code} without auth — "
                    "add Depends(resolve_actor_user) / get_current_user or extend PUBLIC_METHOD_PATHS."
                )
