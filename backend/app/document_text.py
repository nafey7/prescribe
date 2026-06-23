"""Extract readable text from PDF or image documents."""

import asyncio
import io
import logging

logger = logging.getLogger(__name__)


async def extract_text_from_document(file_bytes: bytes, content_type: str) -> str:
    """Extract readable text from a PDF or image document.

    Returns empty string if extraction fails (non-fatal).
    """
    try:
        if "pdf" in content_type:
            return await asyncio.to_thread(_extract_pdf_text, file_bytes)
        if content_type in ("image/jpeg", "image/png"):
            return await asyncio.to_thread(_extract_image_text, file_bytes)
    except Exception:
        logger.warning("Text extraction failed for content_type=%s", content_type, exc_info=True)
    return ""


def _extract_pdf_text(file_bytes: bytes) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def _extract_image_text(file_bytes: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.warning("pytesseract or Pillow not installed — skipping OCR")
        return ""

    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return (text or "").strip()
