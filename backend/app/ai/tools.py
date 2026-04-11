import logging
from pathlib import Path

from langchain_core.tools import tool

from app.config import get_settings

logger = logging.getLogger(__name__)


@tool
def search_patient_records(patient_id: str, query: str = "") -> str:
    """Search and retrieve medical records for a specific patient.

    Args:
        patient_id: The patient identifier (e.g. 'john_doe', 'jane_smith').
        query: Optional search query describing what information is needed.

    Returns:
        The patient's full medical record contents, or an error message if not found.
    """
    settings = get_settings()
    data_dir = Path(settings.PATIENT_DATA_DIR)
    patient_file = data_dir / f"patient_{patient_id}.md"

    if not patient_file.exists():
        available = [
            f.stem.replace("patient_", "")
            for f in data_dir.glob("patient_*.md")
        ]
        return (
            f"No records found for patient '{patient_id}'. "
            f"Available patients: {', '.join(available) if available else 'none'}"
        )

    content = patient_file.read_text(encoding="utf-8")

    if not content.strip():
        return f"Patient records for '{patient_id}' exist but are empty."

    logger.info(
        "Retrieved records for patient '%s' (%d chars)", patient_id, len(content)
    )
    return content
