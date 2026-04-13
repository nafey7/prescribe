# Feature 2: Medical History Dashboard

Patient-facing dashboard that displays a comprehensive view of the patient's health records — active conditions, current medications, recent lab results, medical history timeline, allergies, and links to uploaded documents. Pulls data from both the MongoDB patient profile and the existing Markdown patient files.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 4th (after UI Shell)

**Auth:** Dashboard data is loaded using the active dev-selected `patient_id` from context — **no login or JWT** in this plan (Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)).

---

## Problem

Patients currently have no way to view their own medical history through the app. The data exists in two places:

1. **MongoDB `users` collection** — patient profile with demographics, conditions, allergies (created in Feature 1)
2. **Markdown files** in `data/patients/` — rich medical records with medications, lab results, medical history, family history

The dashboard needs to aggregate both sources into a readable, structured overview. Over time, as more data moves to the database (documents, prescriptions from Phase C), the dashboard will rely less on Markdown files.

---

## Design

### Dashboard sections

The dashboard is a single scrollable page with card-based sections:

```
┌─────────────────────────────────────────────┐
│  Patient Summary Card                       │
│  Name, Age, Sex, Blood Type, Weight/Height  │
├──────────────────────┬──────────────────────┤
│  Active Conditions   │  Allergies           │
│  • Hypertension      │  ⚠ Penicillin       │
│  • Type 2 Diabetes   │  ⚠ Sulfa drugs      │
│  • Hyperlipidemia    │                      │
├──────────────────────┴──────────────────────┤
│  Current Medications                        │
│  ┌──────────┬────────┬──────────┬────────┐  │
│  │ Med      │ Dosage │ Freq     │ Since  │  │
│  ├──────────┼────────┼──────────┼────────┤  │
│  │ Lisin... │ 20mg   │ Daily AM │ 2018   │  │
│  │ Metfo... │ 1000mg │ 2x/day   │ 2020   │  │
│  └──────────┴────────┴──────────┴────────┘  │
├─────────────────────────────────────────────┤
│  Recent Lab Results (January 2025)          │
│  Glucose: 138 ↑  |  HbA1c: 7.2% ↑         │
│  LDL: 142 ↑  |  HDL: 42 ↓  |  ...         │
├─────────────────────────────────────────────┤
│  Medical History Timeline                   │
│  2023 — Colonoscopy (benign polyps)         │
│  2022 — COVID-19 (recovered)                │
│  2017 — Rotator cuff repair                 │
│  2015 — Appendectomy                        │
├─────────────────────────────────────────────┤
│  Recent Documents (from Feature 3)          │
│  📄 Blood Test Results — Jan 2025           │
│  📄 Chest X-Ray — Nov 2024                  │
├──────────────────────┬──────────────────────┤
│  Family History      │  Lifestyle           │
│  Father: Heart...    │  Former smoker       │
│  Mother: Hyper...    │  Alcohol: 2-3/wk     │
│  Brother: T2DM       │  Exercise: 3x/wk     │
└──────────────────────┴──────────────────────┘
```

---

## Backend

### API endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/patients/{patient_id}/medical-history` | Aggregated medical history for dashboard |

### Medical history response schema (`backend/app/schemas/medical_history.py`)

```python
class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    since: str | None = None

class LabResult(BaseModel):
    name: str
    value: str
    status: str = "normal"  # normal | elevated | low | critical
    reference_range: str | None = None

class LabReport(BaseModel):
    date: str
    results: list[LabResult]

class MedicalEvent(BaseModel):
    year: int
    description: str

class MedicalHistoryResponse(BaseModel):
    patient_id: str
    summary: PatientSummary
    conditions: list[Condition]          # from patient profile
    allergies: list[Allergy]             # from patient profile
    medications: list[Medication]        # from Markdown (later from prescriptions in Phase C)
    lab_reports: list[LabReport]         # from Markdown (later from uploaded documents)
    medical_events: list[MedicalEvent]   # from Markdown
    family_history: list[FamilyHistoryEntry]  # from patient profile
    lifestyle: Lifestyle | None          # from patient profile
    recent_documents: list[DocumentSummary]   # from documents collection (Feature 3)

class PatientSummary(BaseModel):
    first_name: str
    last_name: str
    age: int | None
    sex: str | None
    blood_type: str | None
    weight_kg: float | None
    height_cm: float | None

class DocumentSummary(BaseModel):
    document_id: str
    filename: str
    category: str
    uploaded_at: str
```

### Service layer (`backend/app/service/medical_history.py`)

The service aggregates data from multiple sources:

1. **Patient profile** (MongoDB `users` collection) → summary, conditions, allergies, family history, lifestyle
2. **Markdown file** (`data/patients/patient_{id}.md`) → medications, lab results, medical events
3. **Documents collection** (MongoDB `documents`) → recent document summaries

#### Markdown parser

A utility module `backend/app/utils/markdown_parser.py` that:

- Reads a patient Markdown file
- Extracts structured sections by heading (## Current Medications, ## Recent Lab Results, ## Medical History, etc.)
- Parses tables (medications) and list items (events, lab values) into Pydantic models
- Returns a `ParsedPatientMarkdown` dataclass with typed fields

This parser is **read-only** and treats Markdown as a legacy data source. As data migrates to the database (prescriptions in Phase C, lab uploads in Feature 3), the parser becomes less important.

```python
@dataclass
class ParsedPatientMarkdown:
    medications: list[Medication]
    lab_reports: list[LabReport]
    medical_events: list[MedicalEvent]
    raw_sections: dict[str, str]  # fallback for unparsed sections
```

### Service function

```python
async def get_medical_history(db, patient_id: str) -> MedicalHistoryResponse:
    patient = await patient_repo.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")

    markdown_data = parse_patient_markdown(patient_id)
    recent_docs = await document_repo.list_documents(db, patient_id, limit=5)

    return MedicalHistoryResponse(
        patient_id=patient_id,
        summary=build_summary(patient),
        conditions=patient["patient_profile"]["conditions"],
        allergies=patient["patient_profile"]["allergies"],
        medications=markdown_data.medications,
        lab_reports=markdown_data.lab_reports,
        medical_events=markdown_data.medical_events,
        family_history=patient["patient_profile"]["family_history"],
        lifestyle=patient["patient_profile"].get("lifestyle"),
        recent_documents=[map_doc_summary(d) for d in recent_docs],
    )
```

---

## Frontend

### Dashboard page (`frontend/src/pages/DashboardPage.tsx`)

Fetches `GET /api/patients/{patientId}/medical-history` on mount (using `patientId` from `PatientContext`). Renders section cards with loading skeleton states.

### Components

| Component | Data source | Description |
|-----------|-------------|-------------|
| `PatientSummaryCard` | `summary` | Top card with name, age, vitals |
| `ConditionsCard` | `conditions` | List of active conditions with status badges |
| `AllergiesCard` | `allergies` | Warning-styled allergy list with reactions |
| `MedicationsTable` | `medications` | Sortable table of current medications |
| `LabResultsCard` | `lab_reports` | Lab values with abnormal value highlighting (↑/↓ indicators, red/green coloring) |
| `MedicalTimeline` | `medical_events` | Reverse-chronological timeline with year markers |
| `RecentDocumentsCard` | `recent_documents` | Compact list with links to `/documents` page |
| `FamilyHistoryCard` | `family_history` | Simple list of familial conditions |
| `LifestyleCard` | `lifestyle` | Formatted lifestyle data |

### Layout

Uses a CSS Grid for responsive card arrangement:

```
Desktop (≥1024px):      Tablet (768-1023px):     Mobile (<768px):
┌────────┬────────┐     ┌────────────────┐       ┌──────────────┐
│Summary │        │     │   Summary      │       │   Summary    │
├────────┤Allergies│     ├───────┬────────┤       ├──────────────┤
│Conds   │        │     │Conds  │Allergy │       │  Conditions  │
├────────┴────────┤     ├───────┴────────┤       ├──────────────┤
│  Medications    │     │  Medications   │       │  Allergies   │
├─────────────────┤     ├────────────────┤       ├──────────────┤
│  Lab Results    │     │  Lab Results   │       │    ...       │
├─────────────────┤     ├────────────────┤       └──────────────┘
│  Timeline       │     │  Timeline      │       (single column)
├────────┬────────┤     ├───────┬────────┤
│Family  │Lifestyle│     │Family │Lifestyle│
└────────┴────────┘     └───────┴────────┘
```

### API client addition (`frontend/src/api/patients.ts`)

```typescript
export async function getMedicalHistory(patientId: string): Promise<MedicalHistory> {
  return request<MedicalHistory>(`/patients/${patientId}/medical-history`);
}
```

### Custom hook (`frontend/src/hooks/useMedicalHistory.ts`)

```typescript
export function useMedicalHistory() {
  const { currentPatientId } = usePatientContext();
  const [data, setData] = useState<MedicalHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPatientId) return;
    setIsLoading(true);
    getMedicalHistory(currentPatientId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [currentPatientId]);

  return { data, isLoading, error };
}
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/schemas/medical_history.py` | Response models for medical history |
| `backend/app/service/medical_history.py` | Aggregation service |
| `backend/app/utils/markdown_parser.py` | Markdown file → structured data parser |
| `frontend/src/pages/DashboardPage.tsx` | Dashboard page (replaces placeholder) |
| `frontend/src/hooks/useMedicalHistory.ts` | Data fetching hook |
| `frontend/src/components/dashboard/PatientSummaryCard.tsx` | Summary card |
| `frontend/src/components/dashboard/ConditionsCard.tsx` | Conditions display |
| `frontend/src/components/dashboard/AllergiesCard.tsx` | Allergies display |
| `frontend/src/components/dashboard/MedicationsTable.tsx` | Medications table |
| `frontend/src/components/dashboard/LabResultsCard.tsx` | Lab results with indicators |
| `frontend/src/components/dashboard/MedicalTimeline.tsx` | History timeline |
| `frontend/src/components/dashboard/RecentDocumentsCard.tsx` | Recent uploads card |
| `frontend/src/components/dashboard/FamilyHistoryCard.tsx` | Family history |
| `frontend/src/components/dashboard/LifestyleCard.tsx` | Lifestyle info |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/patients.py` | Add `GET /{patient_id}/medical-history` route |
| `frontend/src/types/patient.ts` | Add `MedicalHistory`, `Medication`, `LabReport`, etc. types |
| `frontend/src/api/patients.ts` | Add `getMedicalHistory()` function |

---

## Implementation steps

1. **Build Markdown parser** (`utils/markdown_parser.py`) — parse medications table, lab results, medical events from existing patient files
2. **Create medical history schemas** (`schemas/medical_history.py`)
3. **Build aggregation service** (`service/medical_history.py`)
4. **Add API endpoint** to patients router
5. **Add frontend types** for medical history response
6. **Build dashboard card components** individually, starting with summary card
7. **Compose `DashboardPage`** with all cards + grid layout
8. **Add `useMedicalHistory` hook** for data fetching
9. **Handle loading and error states** — skeleton loaders, error cards
10. **Test with all three existing patients** — verify data renders correctly for each

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Markdown parser extracts medications table | Unit | Correct field extraction |
| Markdown parser extracts lab results | Unit | Values and statuses parsed |
| Markdown parser handles missing sections | Unit | Graceful fallback |
| Medical history endpoint returns aggregated data | API | Both DB and Markdown data present |
| Medical history for nonexistent patient | API | 404 response |
| Dashboard renders all sections | Frontend | Visual completeness |
| Dashboard handles missing optional data | Frontend | No crashes for sparse records |
| Lab result abnormal highlighting | Frontend | Visual indicators correct |
| Dashboard updates when patient switched | Frontend | Context-driven refetch |

---

## AI integration note

The existing `search_patient_records` tool in `ai/tools.py` reads raw Markdown files. Once the dashboard's Markdown parser exists, the AI tool could optionally use the same parser to provide structured data to the LLM instead of raw text. This is an optional enhancement — not blocking for Phase B — but the parser should be designed with reuse in mind.

---

*Created: 2026-04-12*
