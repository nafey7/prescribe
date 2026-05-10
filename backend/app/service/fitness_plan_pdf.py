"""Render `FitnessPlanPayload` as PDF bytes (shared by doctor and patient download endpoints)."""

from __future__ import annotations

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from app.schemas.fitness_plan import FitnessPlanPayload


def _pdf_safe_text(s: str) -> str:
    """Map common Unicode punctuation to Latin-1 so core PDF fonts accept the string."""
    if not s:
        return ""
    s = (
        s.replace("–", "-")
        .replace("—", "-")
        .replace("‘", "'")
        .replace("’", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace("…", "...")
        .replace(" ", " ")
        .replace("×", "x")
    )
    return s.encode("latin-1", errors="replace").decode("latin-1")


def render_fitness_plan_pdf(
    payload: FitnessPlanPayload,
    *,
    title: str | None = None,
    subtitle: str | None = None,
) -> bytes:
    """Build a printable PDF for the given fitness plan. No I/O or FastAPI dependencies."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    heading = _pdf_safe_text((title or "Fitness plan").strip() or "Fitness plan")
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, text=heading, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", size=11)
    if subtitle and subtitle.strip():
        pdf.cell(
            0,
            8,
            text=_pdf_safe_text(subtitle.strip()),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.ln(2)

    pdf.set_font("Helvetica", size=11)
    if payload.goal.strip():
        pdf.cell(
            0,
            7,
            text=_pdf_safe_text(f"Goal: {payload.goal.strip()}"),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
    pdf.cell(
        0,
        7,
        text=_pdf_safe_text(f"Fitness level: {payload.fitness_level.capitalize()}"),
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )
    pdf.ln(2)

    if payload.summary.strip():
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, text="Summary", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", size=11)
        pdf.multi_cell(pdf.epw, 6, text=_pdf_safe_text(payload.summary.strip()))
        pdf.ln(3)

    for day_index, day in enumerate(payload.days):
        if day_index > 0:
            pdf.add_page()
        day_title = _pdf_safe_text(
            (day.label or "").strip() or f"Day {day.day_index}"
        )
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 9, text=day_title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        if day.is_rest_day:
            pdf.set_font("Helvetica", "I", 11)
            pdf.cell(0, 7, text="Rest Day", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            continue

        for session in day.sessions:
            intensity_label = session.intensity.capitalize()
            session_header = _pdf_safe_text(
                f"{session.name} ({session.session_type} - {intensity_label}, "
                f"{session.duration_minutes} min)"
            )
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 8, text=session_header, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Helvetica", size=10)

            if session.warmup_notes.strip():
                pdf.multi_cell(
                    pdf.epw, 5,
                    text=_pdf_safe_text(f"Warm-up: {session.warmup_notes.strip()}")
                )

            for exercise in session.exercises:
                parts: list[str] = [exercise.name]
                if exercise.sets is not None and exercise.reps:
                    parts.append(f"{exercise.sets} x {exercise.reps}")
                elif exercise.sets is not None:
                    parts.append(f"{exercise.sets} sets")
                elif exercise.reps:
                    parts.append(exercise.reps)
                if exercise.duration_minutes is not None:
                    parts.append(f"{exercise.duration_minutes} min")
                if exercise.rest_seconds is not None:
                    parts.append(f"rest {exercise.rest_seconds}s")
                exercise_line = _pdf_safe_text("  - " + " | ".join(parts))
                pdf.cell(0, 5, text=exercise_line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                if exercise.notes.strip():
                    pdf.cell(
                        0, 5,
                        text=_pdf_safe_text(f"    Note: {exercise.notes.strip()}"),
                        new_x=XPos.LMARGIN,
                        new_y=YPos.NEXT,
                    )
                for mod in exercise.modifications:
                    if mod:
                        pdf.cell(
                            0, 5,
                            text=_pdf_safe_text(f"    Modification: {mod}"),
                            new_x=XPos.LMARGIN,
                            new_y=YPos.NEXT,
                        )

            if session.cooldown_notes.strip():
                pdf.multi_cell(
                    pdf.epw, 5,
                    text=_pdf_safe_text(f"Cool-down: {session.cooldown_notes.strip()}")
                )
            pdf.ln(2)

    if payload.medical_notes.strip():
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, text="Medical Notes", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", size=10)
        pdf.multi_cell(pdf.epw, 5, text=_pdf_safe_text(payload.medical_notes.strip()))

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(pdf.epw, 5, text=_pdf_safe_text(payload.disclaimer.strip()))

    out = pdf.output()
    return bytes(out)
