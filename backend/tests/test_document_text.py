import io
from unittest.mock import MagicMock, patch

from PIL import Image

from app.document_text import _extract_image_text, _extract_pdf_text


class _Image:
    def __init__(self, data: bytes):
        self.data = data


class _Page:
    def __init__(self, text: str, images: list[_Image] | None = None):
        self._text = text
        self.images = images or []

    def extract_text(self) -> str:
        return self._text


def _reader(*pages: _Page):
    reader = MagicMock()
    reader.pages = list(pages)
    return reader


def test_pdf_with_selectable_text_does_not_run_ocr():
    with (
        patch("PyPDF2.PdfReader", return_value=_reader(_Page("Glucose 92 mg/dL"))),
        patch("app.document_text._extract_image_text") as ocr,
    ):
        result = _extract_pdf_text(b"pdf")

    assert result == "Glucose 92 mg/dL"
    ocr.assert_not_called()


def test_image_only_pdf_ocr_deduplicates_shared_page_images():
    first = b"first-image"
    second = b"second-image"
    reader = _reader(
        _Page("", [_Image(first), _Image(second)]),
        _Page("", [_Image(first), _Image(second)]),
    )

    with (
        patch("PyPDF2.PdfReader", return_value=reader),
        patch(
            "app.document_text._extract_image_text",
            side_effect=["Page one labs", "Page two labs"],
        ) as ocr,
    ):
        result = _extract_pdf_text(b"pdf", ocr_enabled=True)

    assert result == "Page one labs\nPage two labs"
    assert ocr.call_count == 2


def test_image_only_pdf_continues_when_one_embedded_image_fails():
    reader = _reader(_Page("", [_Image(b"bad"), _Image(b"good")]))

    with (
        patch("PyPDF2.PdfReader", return_value=reader),
        patch(
            "app.document_text._extract_image_text",
            side_effect=[ValueError("bad image"), "Recovered labs"],
        ),
    ):
        result = _extract_pdf_text(b"pdf", ocr_enabled=True)

    assert result == "Recovered labs"


def test_image_only_pdf_does_not_run_ocr_by_default():
    reader = _reader(_Page("", [_Image(b"scan")]))

    with (
        patch("PyPDF2.PdfReader", return_value=reader),
        patch("app.document_text._extract_image_text") as ocr,
    ):
        result = _extract_pdf_text(b"pdf")

    assert result == ""
    ocr.assert_not_called()


def test_image_ocr_uses_grayscale_two_x_upscaling():
    source = Image.new("RGB", (100, 50), color="white")
    raw = io.BytesIO()
    source.save(raw, format="PNG")
    observed: dict[str, object] = {}

    def fake_ocr(image, *, config):
        observed["mode"] = image.mode
        observed["size"] = image.size
        observed["config"] = config
        return "Haemoglobin v11.4 12-15 g/dL"

    with patch("pytesseract.image_to_string", side_effect=fake_ocr):
        result = _extract_image_text(raw.getvalue())

    assert result == "Haemoglobin v11.4 12-15 g/dL"
    assert observed == {
        "mode": "L",
        "size": (200, 100),
        "config": "--psm 3 -c preserve_interword_spaces=1",
    }
