"""Aggregated doctor home dashboard (connections, prescriptions, recent activity)."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import chat as chat_repo
from app.repository import connection as connection_repo
from app.repository import doctor as doctor_repo
from app.repository import patient as patient_repo
from app.repository import patient_activity as activity_repo
from app.repository import prescriptions as prescriptions_repo
from app.schemas.doctor import (
    DashboardStats,
    DoctorDashboardResponse,
    PendingRequestSummary,
    RecentActivityItem,
    RecentPatientSummary,
)
from app.schemas.enums import ConnectionStatus


def _age_from_dob(date_of_birth: str | None) -> int | None:
    if not date_of_birth:
        return None
    try:
        raw = date_of_birth[:10]
        born = datetime.strptime(raw, "%Y-%m-%d").date()
        today = date.today()
        years = today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )
        return years if years >= 0 else None
    except (ValueError, TypeError):
        return None


def _doctor_display_name(doc: dict) -> str:
    prof = doc.get("doctor_profile") or {}
    title = (prof.get("title") or "Dr.").strip()
    fn = (prof.get("first_name") or "").strip()
    ln = (prof.get("last_name") or "").strip()
    if fn or ln:
        return " ".join(p for p in (title, fn, ln) if p).strip()
    dn = (prof.get("display_name") or "").strip()
    if dn:
        return dn
    return doc.get("email") or "Doctor"


def _patient_display_name(doc: dict) -> str:
    prof = doc.get("patient_profile") or {}
    fn = (prof.get("first_name") or "").strip()
    ln = (prof.get("last_name") or "").strip()
    if fn or ln:
        return " ".join(p for p in (fn, ln) if p).strip()
    return doc.get("email") or "Patient"


def _dt_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _ts_from_doc(d: dict, *keys: str) -> datetime | None:
    for k in keys:
        v = d.get(k)
        if isinstance(v, datetime):
            return v
    return None


def _prescription_summary(rx: dict) -> str:
    meds = rx.get("medications") or []
    if meds and isinstance(meds[0], dict):
        m0 = meds[0]
        name = (m0.get("name") or "").strip()
        dosage = (m0.get("dosage") or "").strip()
        if name and dosage:
            return f"{name} — {dosage}"
        if name:
            return name
    diag = (rx.get("diagnosis_summary") or "").strip()
    if diag:
        return diag[:120] + ("…" if len(diag) > 120 else "")
    notes = (rx.get("notes") or "").strip()
    if notes:
        return notes[:120] + ("…" if len(notes) > 120 else "")
    return "Prescription"


async def get_doctor_dashboard(
    db: AsyncIOMotorDatabase, doctor_id: str
) -> DoctorDashboardResponse:
    doctor = await doctor_repo.get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    prof = doctor.get("doctor_profile") or {}
    specialization = (prof.get("specialization") or "").strip()
    institution = prof.get("institution")

    connected = await connection_repo.count_connections(
        db,
        user_id=doctor_id,
        role="doctor",
        status=ConnectionStatus.ACTIVE.value,
    )
    pending_incoming = await connection_repo.count_connections(
        db,
        user_id=doctor_id,
        role="doctor",
        status=ConnectionStatus.PENDING.value,
        initiated_by="patient",
    )
    total_rx = await prescriptions_repo.count_by_doctor(db, doctor_id)

    stats = DashboardStats(
        connected_patients=connected,
        pending_requests=pending_incoming,
        total_prescriptions=total_rx,
    )

    pending_rows, _ = await connection_repo.list_connections_for_doctor(
        db,
        doctor_id,
        status_filter=ConnectionStatus.PENDING.value,
        skip=0,
        limit=3,
        initiated_by="patient",
    )
    pending_summaries: list[PendingRequestSummary] = []
    for row in pending_rows:
        pid = row["patient_id"]
        pdoc = await patient_repo.get_patient(db, pid)
        patient_name = _patient_display_name(pdoc) if pdoc else "Patient"
        initiated_at = row.get("initiated_at")
        ia_str = initiated_at.isoformat() if isinstance(initiated_at, datetime) else ""
        pending_summaries.append(
            PendingRequestSummary(
                connection_id=row["connection_id"],
                patient_id=pid,
                patient_name=patient_name,
                initiated_by=row.get("initiated_by") or "",
                initiated_at=ia_str,
            )
        )

    conns = await connection_repo.list_connected_patients(db, doctor_id)
    recent_items: list[tuple[datetime | None, RecentPatientSummary]] = []
    for c in conns:
        pid = c["patient_id"]
        pdoc = await patient_repo.get_patient(db, pid)
        if not pdoc:
            continue
        pprof = pdoc.get("patient_profile") or {}
        fn = (pprof.get("first_name") or "").strip()
        ln = (pprof.get("last_name") or "").strip()
        slug = (pdoc.get("patient_slug") or "").strip()
        last_ts = await activity_repo.last_interaction_at(
            db,
            doctor_id,
            pdoc["user_id"],
            slug or None,
        )
        recent_items.append(
            (
                last_ts,
                RecentPatientSummary(
                    patient_id=pdoc["user_id"],
                    first_name=fn,
                    last_name=ln,
                    sex=pprof.get("sex"),
                    age=_age_from_dob(pprof.get("date_of_birth")),
                    last_interaction=_dt_iso(last_ts),
                ),
            )
        )
    recent_items.sort(
        key=lambda x: x[0].timestamp() if x[0] else 0.0,
        reverse=True,
    )
    recent_patients = [x[1] for x in recent_items[:6]]

    connected_ids = [c["patient_id"] for c in conns]
    rx_list = await prescriptions_repo.list_prescriptions_for_doctor(
        db, doctor_id, limit=12
    )
    sessions = await chat_repo.list_session_candidates_for_doctor(
        db, doctor_id, connected_ids, max_fetch=40
    )

    activity_candidates: list[tuple[datetime, RecentActivityItem]] = []

    for rx in rx_list:
        ts = _ts_from_doc(rx, "issued_at", "created_at", "updated_at")
        if ts is None:
            continue
        pid = rx.get("patient_id") or ""
        pdoc = await patient_repo.get_patient(db, pid) if pid else None
        pname = _patient_display_name(pdoc) if pdoc else "Patient"
        activity_candidates.append(
            (
                ts,
                RecentActivityItem(
                    type="prescription",
                    timestamp=ts.isoformat(),
                    patient_id=pid,
                    patient_name=pname,
                    summary=_prescription_summary(rx),
                ),
            )
        )

    for sess in sessions[:12]:
        ts = _ts_from_doc(sess, "updated_at", "created_at", "last_message_at")
        if ts is None:
            continue
        pid = str(sess.get("patient_id") or "")
        pdoc = await patient_repo.get_patient(db, pid) if pid else None
        pname = _patient_display_name(pdoc) if pdoc else "Patient"
        chat_id = str(sess.get("chat_id") or "")
        title = (sess.get("title") or "").strip()
        if title:
            summary = title
        else:
            summary = await chat_repo.get_last_assistant_snippet(db, chat_id)
            if not summary:
                summary = "Chat session"
        activity_candidates.append(
            (
                ts,
                RecentActivityItem(
                    type="chat",
                    timestamp=ts.isoformat(),
                    patient_id=pid,
                    patient_name=pname,
                    summary=summary,
                ),
            )
        )

    activity_candidates.sort(key=lambda x: x[0], reverse=True)
    recent_activity = [x[1] for x in activity_candidates[:5]]

    return DoctorDashboardResponse(
        doctor_id=doctor_id,
        doctor_name=_doctor_display_name(doctor),
        specialization=specialization,
        institution=institution,
        stats=stats,
        pending_requests=pending_summaries,
        recent_patients=recent_patients,
        recent_activity=recent_activity,
    )
