"""Unit tests for `get_doctor_dashboard` aggregation."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.service.doctor_dashboard import get_doctor_dashboard


def _minimal_doctor():
    return {
        "user_id": "doc-1",
        "email": "dr@example.com",
        "doctor_profile": {
            "title": "Dr.",
            "first_name": "Sarah",
            "last_name": "Chen",
            "specialization": "Internal Medicine",
            "institution": "Bay Area Medical Center",
        },
    }


@pytest.mark.asyncio
async def test_get_doctor_dashboard_not_found():
    db = MagicMock()
    with patch(
        "app.service.doctor_dashboard.doctor_repo.get_doctor",
        new_callable=AsyncMock,
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            await get_doctor_dashboard(db, "missing")
        assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_doctor_dashboard_empty_lists_match_stats():
    """No connections / activity rows — stats still reflect count queries."""
    db = MagicMock()
    doctor = _minimal_doctor()
    with patch(
        "app.service.doctor_dashboard.doctor_repo.get_doctor",
        new_callable=AsyncMock,
        return_value=doctor,
    ), patch(
        "app.service.doctor_dashboard.connection_repo.count_connections",
        new_callable=AsyncMock,
        side_effect=[12, 3],
    ), patch(
        "app.service.doctor_dashboard.prescriptions_repo.count_by_doctor",
        new_callable=AsyncMock,
        return_value=47,
    ), patch(
        "app.service.doctor_dashboard.connection_repo.list_connections_for_doctor",
        new_callable=AsyncMock,
        return_value=([], 0),
    ), patch(
        "app.service.doctor_dashboard.connection_repo.list_connected_patients",
        new_callable=AsyncMock,
        return_value=[],
    ), patch(
        "app.service.doctor_dashboard.prescriptions_repo.list_prescriptions_for_doctor",
        new_callable=AsyncMock,
        return_value=[],
    ), patch(
        "app.service.doctor_dashboard.chat_repo.list_session_candidates_for_doctor",
        new_callable=AsyncMock,
        return_value=[],
    ):
        out = await get_doctor_dashboard(db, "doc-1")
        assert out.doctor_id == "doc-1"
        assert out.stats.connected_patients == 12
        assert out.stats.pending_requests == 3
        assert out.stats.total_prescriptions == 47
        assert out.specialization == "Internal Medicine"
        assert out.institution == "Bay Area Medical Center"
        assert "Sarah" in out.doctor_name
        assert out.pending_requests == []
        assert out.recent_patients == []
        assert out.recent_activity == []
