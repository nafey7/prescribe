"""Extract readable text from PDF or image documents."""

import asyncio
import hashlib
import io
import logging
import math
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_PDF_OCR_IMAGES = 30
MAX_PDF_OCR_TEXT_CHARS = 100_000
OCR_UPSCALE_FACTOR = 2.0
MAX_OCR_PIXELS = 16_000_000


async def extract_text_from_document(
    file_bytes: bytes,
    content_type: str,
    *,
    ocr_enabled: bool | None = None,
) -> str:
    """Extract readable text from a PDF or image document.

    Returns empty string if extraction fails (non-fatal).
    """
    use_ocr = get_settings().OCR_ENABLED if ocr_enabled is None else ocr_enabled
    try:
        if "pdf" in content_type:
            return await asyncio.to_thread(
                _extract_pdf_text, file_bytes, ocr_enabled=use_ocr
            )
        if content_type in ("image/jpeg", "image/png"):
            if not use_ocr:
                logger.info("OCR is disabled; skipping image text extraction")
                return ""
            return await asyncio.to_thread(_extract_image_text, file_bytes)
    except Exception:
        logger.warning("Text extraction failed for content_type=%s", content_type, exc_info=True)
    return ""


def _extract_pdf_text(file_bytes: bytes, *, ocr_enabled: bool = False) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    extracted = "\n".join(parts).strip()
    if extracted:
        return extracted

    if not ocr_enabled:
        logger.info("OCR is disabled; image-only PDF has no selectable text")
        return ""

    # Image-only PDFs have no selectable text. PyPDF2 exposes decoded embedded
    # page images, which lets us use the same Tesseract path as JPEG/PNG uploads
    # without adding a PDF renderer dependency. Some PDFs share image resources
    # across every page, so hashes prevent repeated OCR of the same image.
    return _extract_pdf_images_text(reader)


def _extract_pdf_images_text(reader: Any) -> str:
    seen: set[str] = set()
    parts: list[str] = []
    processed = 0

    for page_number, page in enumerate(reader.pages, start=1):
        if processed >= MAX_PDF_OCR_IMAGES:
            break
        try:
            images = page.images
        except Exception:
            logger.warning(
                "Could not inspect embedded images on PDF page %d",
                page_number,
                exc_info=True,
            )
            continue

        for image in images:
            if processed >= MAX_PDF_OCR_IMAGES:
                break
            try:
                data = bytes(image.data)
                digest = hashlib.sha256(data).hexdigest()
                if digest in seen:
                    continue
                seen.add(digest)
                processed += 1
                text = _extract_image_text(data)
                if text:
                    parts.append(text)
                if sum(len(part) for part in parts) >= MAX_PDF_OCR_TEXT_CHARS:
                    break
            except Exception:
                logger.warning(
                    "OCR failed for an embedded image on PDF page %d",
                    page_number,
                    exc_info=True,
                )

        if sum(len(part) for part in parts) >= MAX_PDF_OCR_TEXT_CHARS:
            break

    result = "\n".join(parts).strip()[:MAX_PDF_OCR_TEXT_CHARS]
    logger.info(
        "Scanned PDF OCR processed %d unique images and extracted %d characters",
        processed,
        len(result),
    )
    return result


def _extract_image_text(file_bytes: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.warning("pytesseract or Pillow not installed — skipping OCR")
        return ""

    with Image.open(io.BytesIO(file_bytes)) as image:
        prepared = _prepare_image_for_ocr(image)
        text = pytesseract.image_to_string(
            prepared,
            config="--psm 3 -c preserve_interword_spaces=1",
        )
    return (text or "").strip()


def _prepare_image_for_ocr(image: Any) -> Any:
    """Improve small decimal points while bounding OCR memory and CPU usage."""
    from PIL import Image

    grayscale = image.convert("L")
    width, height = grayscale.size
    pixels = max(width * height, 1)
    max_scale = math.sqrt(MAX_OCR_PIXELS / pixels)
    scale = min(OCR_UPSCALE_FACTOR, max_scale)
    if abs(scale - 1.0) < 0.05:
        return grayscale

    target = (
        max(1, round(width * scale)),
        max(1, round(height * scale)),
    )
    return grayscale.resize(target, Image.Resampling.LANCZOS)
