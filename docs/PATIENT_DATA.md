# Patient Data

Schema, naming conventions, and safety rules for patient record files in `data/patients/`.

## Purpose

Patient files are Markdown documents that serve as runtime context for the AI agent. When a user asks a question about a patient, the `search_patient_records` tool reads the relevant file and provides its contents to the LLM.

These files are **data inputs**, not documentation. They are distinct from the docs in `docs/` and the navigation guides in `CLAUDE.md` files.

## File naming convention

```
data/patients/patient_<first>_<last>.md
```

- `<first>` and `<last>` are lowercase, separated by underscores
- The `patient_` prefix and `.md` extension are required
- The portion after `patient_` and before `.md` becomes the `patient_id` used in API requests

Examples:
- `patient_john_doe.md` → patient_id: `john_doe`
- `patient_jane_smith.md` → patient_id: `jane_smith`
- `patient_alex_kumar.md` → patient_id: `alex_kumar`

## Required sections

Every patient record should include these sections (in order):

| Section | Content |
|---------|---------|
| **Demographics** | Name, age, sex, blood type, weight, height |
| **Active Conditions** | Current diagnoses with year and status |
| **Current Medications** | Table: medication, dosage, frequency, since |
| **Allergies** | Known allergies with reaction type and year documented |
| **Recent Lab Results** | Latest lab values with dates |
| **Medical History** | Chronological list of past procedures and events |

## Optional sections

| Section | Content |
|---------|---------|
| **Family History** | Relevant family medical conditions |
| **Lifestyle** | Smoking, alcohol, exercise, diet |
| **Notes** | Provider observations, compliance, follow-up plans |

## Example structure

```markdown
# Patient Record: First Last

## Demographics
- **Name:** First Last
- **Age:** 58
- **Sex:** Male
- **Blood Type:** A+
- **Weight:** 92 kg
- **Height:** 175 cm

## Active Conditions
1. **Condition Name** — Diagnosed YYYY. Status details.

## Current Medications
| Medication | Dosage | Frequency | Since |
|------------|--------|-----------|-------|
| Drug Name | 20 mg | Once daily | 2020 |

## Allergies
- **Drug/Substance** — Reaction type (documented YYYY)

## Recent Lab Results (Month YYYY)
- Test: value (interpretation)

## Medical History
- YYYY: Event description
```

## Discovery and loading

- The backend scans `data/patients/` using `Path.glob("patient_*.md")` at request time
- No restart is needed after adding new files
- The `list_patients` endpoint returns all discovered patient IDs with display names
- Display names are derived from the patient_id: `john_doe` → `John Doe`

## Safety rules

- **All data is synthetic and educational.** Never add real patient data to this repository.
- **Do not commit sensitive or identifiable information.** These files are checked into version control.
- **The AI disclaimer applies.** Responses based on these records are not real medical advice.
- **Do not add non-patient files** to `data/patients/`. Only files matching `patient_*.md` are recognized.
