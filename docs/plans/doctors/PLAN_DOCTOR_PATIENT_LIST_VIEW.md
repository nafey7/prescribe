# Feature 5: Doctor's Patient List & Patient View

The primary navigation surface for doctors — a list of connected patients with search and filtering, plus a comprehensive read-only view of a connected patient's profile, medical history, and documents. When a doctor clicks on a patient card, they see all the data they need to provide care.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 5th (after Doctor UI Shell)

**Auth:** Patient data access is gated by connection status via `verify_connection` (Feature 3) — **no JWT or route guards** in this plan (Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)).

---

## Problem

Doctors need to:

1. See a list of all patients connected to them
2. Search and filter the list by name, condition, or recent activity
3. Click on a patient to view their full medical record
4. Access a patient's profile, medical history dashboard, and uploaded documents in a unified detail view
5. All access must be gated by active connection status

---

## Design

### Patient list page (`/doctor/patients`)

```
┌──────────────────────────────────────────────────────────┐
│  My Patients (12)                      [Search...    🔍] │
├──────────────────────────────────────────────────────────┤
│  Sort: [Recently Connected ▾]   Filter: [All ▾]         │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  👤  John Doe                                      │  │
│  │      Male · 58 · Hypertension, Type 2 Diabetes    │  │
│  │      Connected since: Jan 5, 2026                  │  │
│  │      Last visited: 3 days ago                      │  │
│  │                              [View Patient →]      │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  👤  Jane Smith                                    │  │
│  │      Female · 42 · Asthma                         │  │
│  │      Connected since: Feb 12, 2026                 │  │
│  │      Last visited: 1 week ago                      │  │
│  │                              [View Patient →]      │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  👤  Alex Kumar                                    │  │
│  │      Male · 35 · None reported                    │  │
│  │      Connected since: Mar 1, 2026                  │  │
│  │      Last visited: Never                           │  │
│  │                              [View Patient →]      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ◀ 1 of 2 ▶                                             │
└──────────────────────────────────────────────────────────┘
```

**Patient card details:**
- Avatar placeholder (initials or generic icon)
- Full name
- Demographics: sex, age (calculated from DOB)
- Top conditions (first 2–3 from patient profile)
- Connection date
- Last visit timestamp (last chat session or prescription, if any)
- Click anywhere on the card → navigates to `/doctor/patients/:patientId`

**Search:** Client-side filtering by name across the loaded list; for larger datasets, a `search` query param on the API endpoint.

**Sort options:**
- Recently connected (default)
- Alphabetical (A–Z)
- Last visited (most recent first)

### Patient detail page (`/doctor/patients/:patientId`)

A tabbed or sectioned view that reuses data from the Phase B medical history API, scoped to the doctor's connected patient.

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Patients      John Doe                        │
│                           Male · 58 · A+ · 92kg / 175cm │
├──────────────────────────────────────────────────────────┤
│  [Overview]  [Documents]  [Chat]  [Prescriptions]        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Active Conditions ──────┐  ┌─ Allergies ──────────┐ │
│  │  • Hypertension (2018)   │  │  ⚠ Penicillin       │ │
│  │  • Type 2 Diabetes (2020)│  │  ⚠ Sulfa drugs      │ │
│  │  • Hyperlipidemia (2019) │  │                      │ │
│  └──────────────────────────┘  └──────────────────────┘ │
│                                                          │
│  ┌─ Current Medications ──────────────────────────────┐  │
│  │  Lisinopril 20mg · Daily AM · Since 2018           │  │
│  │  Metformin 1000mg · 2x/day · Since 2020           │  │
│  │  Atorvastatin 40mg · Daily PM · Since 2019        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Recent Lab Results (Jan 2025) ────────────────────┐  │
│  │  Glucose: 138 ↑  |  HbA1c: 7.2% ↑                │  │
│  │  LDL: 142 ↑  |  HDL: 42 ↓                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Medical History ──────────────────────────────────┐  │
│  │  2023 — Colonoscopy (benign polyps)                │  │
│  │  2022 — COVID-19 (recovered)                       │  │
│  │  2017 — Rotator cuff repair                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Recent Documents ─────────────────────────────────┐  │
│  │  📄 Blood Test Results — Jan 2025                  │  │
│  │  📄 Chest X-Ray — Nov 2024                        │  │
│  │  [View All Documents →]                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Family / Lifestyle ───┐  ┌─ Emergency Contact ───┐  │
│  │  Father: Heart attack  │  │  Jane Doe (Spouse)    │  │
│  │  Former smoker         │  │  +1-555-0124          │  │
│  └────────────────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

The **Overview** tab shows essentially the same medical history dashboard as the patient sees — reusing `MedicalHistoryResponse` data and dashboard card components from Phase B. The doctor's view is **read-only** (no edit buttons on the patient's profile).

**Tab navigation:**
- **Overview** — Medical history dashboard (default)
- **Documents** — Patient's uploaded documents (browse, preview, download — no upload/delete from doctor side)
- **Chat** → navigates to `/doctor/patients/:patientId/chat` (Feature 7)
- **Prescriptions** → navigates to `/doctor/patients/:patientId/prescriptions` (Feature 8)

---

## Backend

### Connection-gated patient data APIs

All endpoints check `verify_connection(db, doctor_id, patient_id)` before returning data. These are **new routes** under the doctor namespace, not modifications to existing patient APIs.

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/api/doctors/{doctor_id}/patients` | List connected patients with summaries | `connections` + `users` join |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/profile` | Connected patient's profile | `users` collection |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/medical-history` | Connected patient's medical history | Same as patient dashboard API |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents` | Connected patient's documents | `documents` collection |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents/{document_id}` | Download/view patient document | GridFS stream |

### Pydantic schemas (`backend/app/schemas/doctor.py` — additions)

```python
class ConnectedPatientSummary(BaseModel):
    """Patient card in the doctor's patient list."""
    patient_id: str
    first_name: str
    last_name: str
    age: int | None
    sex: str | None
    conditions: list[str]
    connected_since: str
    last_interaction: str | None = None

class ConnectedPatientListResponse(BaseModel):
    patients: list[ConnectedPatientSummary]
    total: int
```

### Service (`backend/app/service/doctor_patients.py`)

| Function | Description |
|----------|-------------|
| `get_connected_patient_list(db, doctor_id, search, sort, skip, limit)` | Join connections + users, build summaries with age calculation and top conditions |
| `get_connected_patient_profile(db, doctor_id, patient_id)` | `verify_connection` → return `PatientProfileResponse` |
| `get_connected_patient_history(db, doctor_id, patient_id)` | `verify_connection` → delegate to existing `get_medical_history` |
| `list_connected_patient_documents(db, doctor_id, patient_id, ...)` | `verify_connection` → delegate to existing `list_patient_documents` |
| `download_connected_patient_document(db, doctor_id, patient_id, document_id)` | `verify_connection` → delegate to existing `download_document` |

The key pattern: **`verify_connection` first, then delegate to existing Phase B services.** This avoids duplicating business logic — the doctor sees the same data the patient sees, but access is gated.

### API routes (`backend/app/api/doctor_patients.py`)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `GET` | `/api/doctors/{doctor_id}/patients` | `get_connected_patient_list` | Query: `search`, `sort`, `skip`, `limit` |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/profile` | `get_connected_patient_profile` | 403 if not connected |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/medical-history` | `get_connected_patient_history` | 403 if not connected |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents` | `list_connected_patient_documents` | 403 if not connected; supports `category`, `page`, `page_size` |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents/{document_id}` | `download_connected_patient_document` | 403 if not connected |

---

## Frontend

### Patient list page (`frontend/src/pages/doctor/DoctorPatientListPage.tsx`)

Fetches `GET /api/doctors/{doctorId}/patients` on mount. Renders patient cards with search input and sort controls.

### Patient detail page (`frontend/src/pages/doctor/DoctorPatientDetailPage.tsx`)

Uses `patientId` from URL params. Fetches patient profile and medical history. Renders the same dashboard card components from Phase B in read-only mode.

### Components

| Component | Purpose |
|-----------|---------|
| `DoctorPatientListPage` | Page: search bar, sort control, patient card grid, pagination |
| `PatientCard` | Clickable card showing patient summary (name, demographics, conditions, connection date) |
| `PatientSearchBar` | Search input with debounced filtering |
| `PatientSortControl` | Dropdown for sort order |
| `DoctorPatientDetailPage` | Page: tabbed patient detail view |
| `PatientOverviewTab` | Reuses Phase B dashboard cards in read-only mode |
| `PatientDocumentsTab` | Browse and preview patient documents (no upload/delete actions) |
| `PatientDetailTabs` | Tab navigation: Overview, Documents, Chat, Prescriptions |

### Reused Phase B components (read-only mode)

These existing dashboard card components are reused in the doctor's patient detail view with an `isReadOnly` or `isDoctor` prop to suppress edit actions:

- `PatientSummaryCard` — name, age, vitals
- `ConditionsCard` — active conditions
- `AllergiesCard` — allergies with reactions
- `MedicationsTable` — current medications
- `LabResultsCard` — lab results with indicators
- `MedicalTimeline` — history timeline
- `RecentDocumentsCard` — recent uploads
- `FamilyHistoryCard` — family history
- `LifestyleCard` — lifestyle info

### API client additions (`frontend/src/api/doctors.ts`)

```typescript
export async function getConnectedPatients(
  doctorId: string,
  options?: { search?: string; sort?: string; skip?: number; limit?: number }
): Promise<ConnectedPatientListResponse> { ... }

export async function getConnectedPatientProfile(
  doctorId: string,
  patientId: string
): Promise<PatientProfile> { ... }

export async function getConnectedPatientHistory(
  doctorId: string,
  patientId: string
): Promise<MedicalHistory> { ... }

export async function listConnectedPatientDocuments(
  doctorId: string,
  patientId: string,
  options?: { category?: string; page?: number; pageSize?: number }
): Promise<DocumentListResponse> { ... }

export async function getConnectedPatientDocumentUrl(
  doctorId: string,
  patientId: string,
  documentId: string
): string { ... }
```

### TypeScript types (`frontend/src/types/doctor.ts` — additions)

```typescript
export interface ConnectedPatientSummary {
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  sex: string | null;
  conditions: string[];
  connected_since: string;
  last_interaction: string | null;
}

export interface ConnectedPatientListResponse {
  patients: ConnectedPatientSummary[];
  total: number;
}
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/service/doctor_patients.py` | Connection-gated patient data access |
| `backend/app/api/doctor_patients.py` | Doctor patient-view endpoints |
| `frontend/src/pages/doctor/DoctorPatientListPage.tsx` | Patient list page (replaces placeholder) |
| `frontend/src/pages/doctor/DoctorPatientDetailPage.tsx` | Patient detail page (replaces placeholder) |
| `frontend/src/components/doctor/PatientCard.tsx` | Patient card for list view |
| `frontend/src/components/doctor/PatientSearchBar.tsx` | Search input |
| `frontend/src/components/doctor/PatientDetailTabs.tsx` | Tab navigation for patient detail |
| `frontend/src/components/doctor/PatientOverviewTab.tsx` | Read-only medical history view |
| `frontend/src/components/doctor/PatientDocumentsTab.tsx` | Read-only document browser |
| `frontend/src/hooks/useConnectedPatients.ts` | Data fetching hook for patient list |
| `frontend/src/hooks/usePatientDetail.ts` | Data fetching hook for patient detail |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/router.py` | Mount doctor patient-view routes |
| `frontend/src/api/doctors.ts` | Add patient data access functions |
| `frontend/src/types/doctor.ts` | Add `ConnectedPatientSummary` types |
| Phase B dashboard cards | Add `isReadOnly` prop to suppress edit actions when used in doctor view |

---

## Implementation steps

1. **Create `doctor_patients.py` service** with connection-gated wrappers
2. **Create `doctor_patients.py` API routes** and mount in router
3. **Test API connection gating** — 200 for connected, 403 for non-connected
4. **Create `PatientCard` component** for list view
5. **Build patient list page** with search, sort, and pagination
6. **Add `isReadOnly` prop** to reusable Phase B dashboard cards
7. **Build patient detail page** with tabbed layout and overview tab
8. **Build documents tab** for read-only document browsing
9. **Create data fetching hooks** (`useConnectedPatients`, `usePatientDetail`)
10. **Test full flow** — list → card click → detail → tabs → documents

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Get connected patients list | API | Returns only patients with active connections |
| Get patient profile when connected | API | 200 with full profile data |
| Get patient profile when NOT connected | API | 403 forbidden |
| Get patient medical history when connected | API | 200 with aggregated data |
| Get patient documents when connected | API | 200 with document list |
| Download patient document when connected | API | Binary stream returned |
| Download patient document when NOT connected | API | 403 forbidden |
| Patient list renders connected patients | Frontend | All cards displayed |
| Search filters patient list | Frontend | Correct filtering |
| Patient card click navigates to detail | Frontend | Route change |
| Patient detail shows medical history | Frontend | All dashboard sections render |
| Documents tab shows patient documents | Frontend | Document list with preview |
| Tab navigation works | Frontend | All tabs accessible |
| Read-only mode — no edit buttons | Frontend | Edit actions hidden |

---

*Created: 2026-04-12*
