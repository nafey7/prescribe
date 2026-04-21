"""Render `MealPlanPayload` as PDF bytes (shared by doctor and patient download endpoints)."""

from __future__ import annotations

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from app.schemas.meal_plan import MealPlanPayload


def _pdf_safe_text(s: str) -> str:
    """Map common Unicode punctuation to Latin-1 so core PDF fonts accept the string."""
    if not s:
        return ""
    s = (
        s.replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2026", "...")
        .replace("\u00a0", " ")
    )
    return s.encode("latin-1", errors="replace").decode("latin-1")


def render_meal_plan_pdf(
    payload: MealPlanPayload,
    *,
    title: str | None = None,
    subtitle: str | None = None,
) -> bytes:
    """Build a printable PDF for the given meal plan. No I/O or FastAPI dependencies."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    heading = _pdf_safe_text((title or "Meal plan").strip() or "Meal plan")
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

    if payload.summary.strip():
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, text="Summary", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", size=11)
        pdf.multi_cell(pdf.epw, 6, text=_pdf_safe_text(payload.summary.strip()))
        pdf.ln(3)

    for day_index, day in enumerate(payload.days):
        if day_index > 0:
            pdf.add_page()
        day_title = _pdf_safe_text((day.label or "").strip() or f"Day {day.day_index}")
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 9, text=day_title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", size=11)
        for meal in day.meals:
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 7, text=_pdf_safe_text(meal.name), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Helvetica", size=10)
            if meal.description.strip():
                pdf.multi_cell(pdf.epw, 5, text=_pdf_safe_text(meal.description.strip()))
            for item in meal.items:
                if item:
                    pdf.cell(
                        0,
                        5,
                        text=_pdf_safe_text(f"  - {item}"),
                        new_x=XPos.LMARGIN,
                        new_y=YPos.NEXT,
                    )
            pdf.ln(2)

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(pdf.epw, 5, text=_pdf_safe_text(payload.disclaimer.strip()))

    out = pdf.output()
    return bytes(out)
