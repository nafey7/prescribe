# Feature 8: Prescription Management

Doctors create, view, and manage prescriptions for connected patients. Prescriptions are stored in MongoDB, visible in both the doctor and patient portals, and become part of the patient's medical history. Only connected doctors can write prescriptions for a patient.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 8th (last feature — depends on connections and patient view)

**Auth:** Prescription APIs use dev-time `X-Doctor-Id` header for identity — **no JWT** in this plan (Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)).

---

## Problem

Prescription management is a core product pillar — connected doctors should be able to:

1. Write new prescriptions for connected patients
2. View a patient's prescription history (their own + other connected doctors')
3. Manage prescription status (active, completed, discontinued)
4. Patients should be able to view all prescriptions written for them

Today there is no prescription infrastructure. Medication data exists only in static Markdown files. Phase C adds a database-backed prescription system.

---

## Data model

### MongoDB collection: `prescriptions`

```json
{
  "_id": ObjectId,
  "prescription_id": "uuid-string",
  "doctor_id": "uuid-string",
  "patient_id": "uuid-string",
  "status": "active",
  "diagnosis": "Type 2 Diabetes Mellitus, uncontrolled",
  "notes": "Adjusting dosage based on recent HbA1c of 7.2%",
  "medications": [
    {
      "name": "Metformin",
      "dosage": "1000mg",
      "frequency": "Twice daily with meals",
      "route": "oral",
      "duration": "90 days",
      "quantity": "180 tablets",
      "refills": 2,
      "instructions": "Take with food to minimize GI side effects"
    },
    {
      "name": "Glipizide",
      "dosage": "5mg",
      "frequency": "Once daily before breakfast",
      "route": "oral",
      "duration": "90 days",
      "quantity": "90 tablets",
      "refills": 2,
      "instructions": "Monitor blood sugar regularly"
    }
  ],
  "prescribed_at": ISODate,
  "valid_until": ISODate,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### Prescription statuses

| Status | Meaning |
|--------|---------|
| `active` | Currently valid, patient should be taking these medications |
| `completed` | Course finished as prescribed |
| `discontinued` | Stopped early by the prescribing doctor (reason in `notes`) |
| `expired` | Past `valid_until` date (can be auto-set by background check or on read) |

### Indexes

```javascript
db.createCollection("prescriptions");
db.prescriptions.createIndex({ prescription_id: 1 }, { unique: true });
db.prescriptions.createIndex({ patient_id: 1, prescribed_at: -1 });
db.prescriptions.createIndex({ doctor_id: 1, prescribed_at: -1 });
db.prescriptions.createIndex({ patient_id: 1, status: 1 });
```

---

## Backend

### Pydantic schemas (`backend/app/schemas/prescription.py`)

```python
class MedicationItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., min_length=1)
    frequency: str = Field(..., min_length=1)
    route: str = "oral"  # oral | topical | injection | inhaled | etc.
    duration: str | None = None
    quantity: str | None = None
    refills: int = 0
    instructions: str = ""

class PrescriptionCreate(BaseModel):
    diagnosis: str = Field(..., min_length=1, max_length=500)
    notes: str = ""
    medications: list[MedicationItem] = Field(..., min_length=1)
    valid_until: str | None = None  # ISO date string; defaults to 90 days from now

class PrescriptionUpdate(BaseModel):
    status: str | None = None  # active | completed | discontinued
    notes: str | None = None

class PrescriptionResponse(BaseModel):
    prescription_id: str
    doctor_id: str
    patient_id: str
    doctor_name: str
    patient_name: str
    status: str
    diagnosis: str
    notes: str
    medications: list[MedicationItem]
    prescribed_at: str
    valid_until: str | None
    created_at: str
    updated_at: str

class PrescriptionListResponse(BaseModel):
    prescriptions: list[PrescriptionResponse]
    total: int
    page: int
    page_size: int

class PrescriptionSummary(BaseModel):
    """Lightweight prescription info for dashboard cards."""
    prescription_id: str
    diagnosis: str
    medication_names: list[str]
    status: str
    prescribed_at: str
    doctor_name: str
```

### Repository (`backend/app/repository/prescription.py`)

| Function | Description |
|----------|-------------|
| `create_prescription(db, data)` | Insert with auto-generated `prescription_id`, default `status: "active"` |
| `get_prescription(db, prescription_id)` | `find_one` by `prescription_id` |
| `update_prescription(db, prescription_id, data)` | Update status and/or notes |
| `list_prescriptions_for_patient(db, patient_id, status, page, page_size)` | Paginated list for a patient |
| `list_prescriptions_by_doctor(db, doctor_id, patient_id, page, page_size)` | Paginated list by doctor (optional patient filter) |
| `count_prescriptions_by_doctor(db, doctor_id)` | Count for dashboard stats |
| `count_prescriptions_for_patient(db, patient_id)` | Count for patient dashboard |

### Service (`backend/app/service/prescription.py`)

| Function | Description |
|----------|-------------|
| `create_prescription(db, doctor_id, patient_id, data)` | `verify_connection` → validate medications → create with doctor/patient enrichment |
| `get_prescription_detail(db, prescription_id, requesting_user_id)` | Fetch + verify the requester is the prescribing doctor or the patient |
| `update_prescription(db, prescription_id, doctor_id, data)` | Only the prescribing doctor can update; verify ownership |
| `list_patient_prescriptions(db, patient_id, status, page, page_size)` | For patient portal — all prescriptions for the patient |
| `list_doctor_prescriptions(db, doctor_id, patient_id, status, page, page_size)` | For doctor portal — prescriptions by this doctor |
| `list_patient_prescriptions_for_doctor(db, doctor_id, patient_id, ...)` | `verify_connection` → list prescriptions for a specific connected patient |

#### Validation rules

```python
MAX_MEDICATIONS_PER_PRESCRIPTION = 10
VALID_ROUTES = {"oral", "topical", "injection", "inhaled", "sublingual", "rectal", "ophthalmic", "otic", "nasal", "transdermal"}
VALID_STATUSES = {"active", "completed", "discontinued"}
DEFAULT_VALIDITY_DAYS = 90
```

### API routes

#### Doctor-side (`backend/app/api/doctor_prescriptions.py`)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions` | `create_prescription` | Connection-gated; 201 on success |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions` | `list_patient_prescriptions_for_doctor` | Connection-gated; paginated |
| `GET` | `/api/doctors/{doctor_id}/prescriptions` | `list_doctor_prescriptions` | All prescriptions by this doctor |
| `GET` | `/api/prescriptions/{prescription_id}` | `get_prescription_detail` | Validates access |
| `PUT` | `/api/prescriptions/{prescription_id}` | `update_prescription` | Only prescribing doctor can update |

#### Patient-side (`backend/app/api/patients.py` — additions)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `GET` | `/api/patients/{patient_id}/prescriptions` | `list_patient_prescriptions` | All prescriptions for this patient |

---

## Frontend

### Doctor-side: Prescriptions page (`/doctor/patients/:patientId/prescriptions`)

```
┌──────────────────────────────────────────────────────────┐
│  PatientContextBar: ← Back | John Doe | tabs...          │
├──────────────────────────────────────────────────────────┤
│  Prescriptions for John Doe     [+ New Prescription]     │
├──────────────────────────────────────────────────────────┤
│  Filter: [All ▾] [Active] [Completed] [Discontinued]    │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  💊 Rx #1 — Type 2 Diabetes Management            │  │
│  │     Prescribed: Mar 10, 2026 · Status: Active 🟢   │  │
│  │     By: Dr. Sarah Chen                             │  │
│  │                                                    │  │
│  │     Medications:                                   │  │
│  │     • Metformin 1000mg — Twice daily with meals    │  │
│  │     • Glipizide 5mg — Once daily before breakfast  │  │
│  │                                                    │  │
│  │     Notes: Adjusting dosage based on HbA1c 7.2%   │  │
│  │                                                    │  │
│  │     [Edit Status ▾] [View Details]                 │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  💊 Rx #2 — Hypertension Management               │  │
│  │     Prescribed: Jan 5, 2026 · Status: Active 🟢    │  │
│  │     By: Dr. Sarah Chen                             │  │
│  │                                                    │  │
│  │     Medications:                                   │  │
│  │     • Lisinopril 20mg — Daily AM                   │  │
│  │     • Amlodipine 5mg — Daily                       │  │
│  │                                                    │  │
│  │     [Edit Status ▾] [View Details]                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### New Prescription form (modal or full page)

```
┌──────────────────────────────────────────────────┐
│  New Prescription — John Doe                      │
├──────────────────────────────────────────────────┤
│  Diagnosis *                                      │
│  [Type 2 Diabetes Mellitus, uncontrolled      ]  │
│                                                   │
│  Medications                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  Name *: [Metformin                      ] │   │
│  │  Dosage *: [1000mg    ] Freq *: [BID     ] │   │
│  │  Route: [oral ▾]  Duration: [90 days     ] │   │
│  │  Qty: [180 tablets]  Refills: [2         ] │   │
│  │  Instructions: [Take with food...        ] │   │
│  │  [✕ Remove]                                │   │
│  └────────────────────────────────────────────┘   │
│  [+ Add Medication]                               │
│                                                   │
│  Valid Until: [2026-06-10        ] (90 days)      │
│                                                   │
│  Notes                                            │
│  [Adjusting dosage based on recent HbA1c...   ]  │
│                                                   │
│  [Cancel]                        [Create Rx]      │
└──────────────────────────────────────────────────┘
```

### Patient-side: My Prescriptions page (`/prescriptions`)

Route: `/prescriptions` under `PatientLayout`

```
┌──────────────────────────────────────────────────────────┐
│  My Prescriptions                                        │
├──────────────────────────────────────────────────────────┤
│  Filter: [All ▾] [Active] [Completed] [Discontinued]    │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  💊 Type 2 Diabetes Management                     │  │
│  │     Dr. Sarah Chen · Mar 10, 2026 · Active 🟢      │  │
│  │     Metformin 1000mg, Glipizide 5mg                │  │
│  │     [View Details]                                 │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  💊 Hypertension Management                        │  │
│  │     Dr. Sarah Chen · Jan 5, 2026 · Active 🟢       │  │
│  │     Lisinopril 20mg, Amlodipine 5mg               │  │
│  │     [View Details]                                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

Patient view is **read-only** — no create, edit, or status change actions.

### Components

| Component | Purpose |
|-----------|---------|
| `DoctorPrescriptionsPage` | Doctor-side: list prescriptions + create button |
| `PatientPrescriptionsPage` | Patient-side: read-only prescription list |
| `PrescriptionCard` | Display card for a single prescription (expandable) |
| `PrescriptionDetailModal` | Full prescription detail view |
| `NewPrescriptionForm` | Create prescription form with medication items |
| `MedicationItemForm` | Single medication entry within the prescription form |
| `PrescriptionStatusBadge` | Color-coded status badge (active=green, discontinued=red, etc.) |
| `PrescriptionStatusDropdown` | Doctor-only: change status (active → completed/discontinued) |
| `PrescriptionFilter` | Status filter pills |

### API client (`frontend/src/api/prescriptions.ts`)

```typescript
export async function createPrescription(
  doctorId: string,
  patientId: string,
  data: PrescriptionCreateRequest
): Promise<PrescriptionResponse> { ... }

export async function listPatientPrescriptionsForDoctor(
  doctorId: string,
  patientId: string,
  options?: { status?: string; page?: number; pageSize?: number }
): Promise<PrescriptionListResponse> { ... }

export async function listDoctorPrescriptions(
  doctorId: string,
  options?: { patientId?: string; page?: number; pageSize?: number }
): Promise<PrescriptionListResponse> { ... }

export async function listPatientPrescriptions(
  patientId: string,
  options?: { status?: string; page?: number; pageSize?: number }
): Promise<PrescriptionListResponse> { ... }

export async function getPrescription(
  prescriptionId: string
): Promise<PrescriptionResponse> { ... }

export async function updatePrescription(
  prescriptionId: string,
  data: PrescriptionUpdateRequest
): Promise<PrescriptionResponse> { ... }
```

### TypeScript types (`frontend/src/types/prescription.ts`)

```typescript
export type PrescriptionStatus = "active" | "completed" | "discontinued" | "expired";

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string | null;
  quantity: string | null;
  refills: number;
  instructions: string;
}

export interface PrescriptionResponse {
  prescription_id: string;
  doctor_id: string;
  patient_id: string;
  doctor_name: string;
  patient_name: string;
  status: PrescriptionStatus;
  diagnosis: string;
  notes: string;
  medications: MedicationItem[];
  prescribed_at: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionListResponse {
  prescriptions: PrescriptionResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface PrescriptionCreateRequest {
  diagnosis: string;
  notes?: string;
  medications: MedicationItem[];
  valid_until?: string;
}

export interface PrescriptionUpdateRequest {
  status?: PrescriptionStatus;
  notes?: string;
}
```

---

## Integration with existing features

### Patient medical history dashboard

The `MedicalHistoryResponse` from Feature 2 (Phase B) includes `medications` from Markdown files. Phase C can extend this to **also** include active prescriptions from the `prescriptions` collection:

```python
# In medical_history service — optional enhancement
active_rx = await prescription_repo.list_prescriptions_for_patient(
    db, patient_id, status="active", page=1, page_size=50
)
# Merge with Markdown-sourced medications for a complete view
```

### Doctor dashboard

The dashboard (Feature 6) already includes `total_prescriptions` in stats and prescription items in `recent_activity`. These are powered by `prescription_repo.count_by_doctor` and recent prescription queries.

---

## Seed data

`backend/scripts/seed_prescriptions.py` creates sample prescriptions using the seed connections:

| Doctor | Patient | Diagnosis | Medications | Status |
|--------|---------|-----------|-------------|--------|
| Dr. Sarah Chen | John Doe | Type 2 Diabetes Mellitus | Metformin 1000mg, Glipizide 5mg | active |
| Dr. Sarah Chen | John Doe | Hypertension | Lisinopril 20mg, Amlodipine 5mg | active |
| Dr. Sarah Chen | Jane Smith | Asthma | Albuterol inhaler, Fluticasone | active |
| Dr. Michael Rivera | Alex Kumar | Annual checkup | Vitamin D 2000 IU | completed |

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/schemas/prescription.py` | Prescription Pydantic models |
| `backend/app/repository/prescription.py` | MongoDB CRUD for prescriptions |
| `backend/app/service/prescription.py` | Prescription business logic |
| `backend/app/api/doctor_prescriptions.py` | Doctor prescription endpoints |
| `backend/scripts/seed_prescriptions.py` | Seed prescription data |
| `frontend/src/pages/doctor/DoctorPrescriptionsPage.tsx` | Doctor prescription management (replaces placeholder) |
| `frontend/src/pages/PatientPrescriptionsPage.tsx` | Patient prescription view |
| `frontend/src/api/prescriptions.ts` | Prescription API client |
| `frontend/src/types/prescription.ts` | Prescription TypeScript types |
| `frontend/src/components/prescriptions/PrescriptionCard.tsx` | Prescription display card |
| `frontend/src/components/prescriptions/NewPrescriptionForm.tsx` | Create prescription form |
| `frontend/src/components/prescriptions/MedicationItemForm.tsx` | Single medication entry |
| `frontend/src/components/prescriptions/PrescriptionDetailModal.tsx` | Full detail view |
| `frontend/src/components/prescriptions/PrescriptionStatusBadge.tsx` | Status badge |
| `frontend/src/components/prescriptions/PrescriptionFilter.tsx` | Status filter |
| `frontend/src/hooks/usePrescriptions.ts` | Data fetching hook |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/router.py` | Mount prescription routes |
| `backend/app/api/patients.py` | Add `GET /{patient_id}/prescriptions` route |
| `init-mongo.js` | Add `prescriptions` collection and indexes |
| `frontend/src/router.tsx` | Add `/prescriptions` (patient) route |
| `frontend/src/components/Sidebar.tsx` | Add "My Prescriptions" nav item for patients |
| `frontend/src/components/dashboard/MedicationsTable.tsx` | Optionally merge DB prescriptions with Markdown medications |

---

## Implementation steps

1. **Add `prescriptions` collection and indexes** to `init-mongo.js`
2. **Create backend schemas** (`schemas/prescription.py`)
3. **Create repository layer** (`repository/prescription.py`)
4. **Create service layer** (`service/prescription.py`) with connection checks
5. **Create doctor prescription API routes** (`api/doctor_prescriptions.py`)
6. **Add patient prescription endpoint** to existing patient routes
7. **Write seed script** and run it
8. **Create frontend types and API client** (`types/prescription.ts`, `api/prescriptions.ts`)
9. **Build `PrescriptionCard` and `PrescriptionStatusBadge`** components
10. **Build `NewPrescriptionForm`** with dynamic medication items
11. **Build doctor prescriptions page** with create, list, filter
12. **Build patient prescriptions page** (read-only list)
13. **Add routes and sidebar navigation** for both portals
14. **Test full prescription lifecycle** — create, view, update status

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Create prescription when connected | API | 201, prescription created with medications |
| Create prescription when NOT connected | API | 403 forbidden |
| Create prescription with no medications | API | 422 validation error |
| Create prescription exceeding max medications | API | 422 validation error |
| List prescriptions for patient | API | Paginated, correct filtering |
| List prescriptions by doctor | API | Only this doctor's prescriptions |
| Update prescription status | API | Status changes, `updated_at` updated |
| Update prescription by non-prescribing doctor | API | 403 forbidden |
| Get prescription detail | API | Full data returned |
| Patient view shows all prescriptions from all doctors | API | Cross-doctor visibility for patient |
| New prescription form creates successfully | Frontend | Form submission, list update |
| Medication items can be added/removed | Frontend | Dynamic form behavior |
| Status change dropdown works | Frontend | API called, badge updates |
| Patient prescriptions page is read-only | Frontend | No create/edit actions visible |
| Prescription card expands to show details | Frontend | All fields visible |
| Seed prescriptions appear for seed doctors/patients | Script | Data visible in both portals |

---

*Created: 2026-04-12*
