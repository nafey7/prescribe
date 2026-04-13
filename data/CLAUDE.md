# Data — CLAUDE.md

This directory contains patient medical record files used as runtime AI context. These are **not** documentation or process files — they are data inputs read by the backend's `search_patient_records` tool.

Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Purpose

Patient files in `data/patients/` are Markdown documents that the LangGraph agent reads when answering medical questions. The AI tool loads the full file content and uses it to ground responses in patient-specific data.

## Current files

```
data/patients/
├── patient_john_doe.md
├── patient_jane_smith.md
└── patient_alex_kumar.md
```

## Rules

- **Educational data only.** All records are synthetic. Never treat these as real PHI or use real patient data in this repo.
- **Naming convention:** `patient_<first>_<last>.md` — the `<first>_<last>` portion becomes the `patient_id` used in API requests.
- **Required sections:** Demographics, Active Conditions, Current Medications, Allergies, Lab Results, Medical History. See [`docs/PATIENT_DATA.md`](../docs/PATIENT_DATA.md) for the full schema.
- **Auto-discovery:** The backend scans `data/patients/` at request time — no restart needed after adding new files.
- **Do not add non-patient files** to this directory. Only `patient_*.md` files are recognized by the tool.

## Deep docs

- [Patient data schema and conventions](../docs/PATIENT_DATA.md)
