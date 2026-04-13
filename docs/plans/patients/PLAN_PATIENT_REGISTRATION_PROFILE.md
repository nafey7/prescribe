# Feature 1: Patient Registration & Profile Management

Backend APIs and frontend forms for creating, viewing, and editing **patient profile records** in MongoDB. This is the core **data** layer for the patient portal — every other Phase B feature (dashboard, documents, chat) references the patient record created or selected here.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 2nd (after Dev Identity Picker)

## Not authentication (explicitly out of scope here)

Per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md), **signup, login, JWT, password hashing, email verification, and protected routes belong in Phase E**, after patient, doctor, and admin work. This plan does **not** specify those flows.

Here, **“registration” means creating or seeding a `users` / patient profile document** (demographics, clinical fields) and editing it in the UI — not an authenticated end-user sign-up experience. **`POST /api/patients`** is a profile-creation API for dev/testing and data migration; Phase E will attach real accounts and credentials to the same schema later.

---

## Problem

Today, "patients" are just filename slugs (`john_doe`) derived from Markdown files in `data/patients/`. There are no database-backed patient records, no profile editing, and no way for a patient to manage their own information. Phase B needs:

1. A `users` collection in MongoDB with patient profile documents
2. APIs to create, read, update, and list patients
3. A frontend profile page for viewing and editing demographics, allergies, and conditions
4. Seed data migration from existing Markdown files into the database

---

## Data model

### MongoDB collection: `users`

```json
{
  "_id": ObjectId,
  "user_id": "uuid-string",
  "role": "patient",
  "email": "john.doe@example.com",
  "created_at": ISODate,
  "updated_at": ISODate,
  "patient_profile": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1968-03-15",
    "sex": "male",
    "blood_type": "A+",
    "weight_kg": 92,
    "height_cm": 175,
    "phone": "+1-555-0123",
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701"
    },
    "emergency_contact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1-555-0124"
    },
    "allergies": [
      { "substance": "Penicillin", "reaction": "Rash and hives", "documented_date": "2005" }
    ],
    "conditions": [
      { "name": "Hypertension", "diagnosed_year": 2018, "status": "active", "notes": "Stage 2, well-controlled" }
    ],
    "family_history": [
      { "relation": "Father", "condition": "Heart attack at age 62, Type 2 diabetes" }
    ],
    "lifestyle": {
      "smoking_status": "former",
      "smoking_notes": "Quit 2016, 20 pack-year history",
      "alcohol": "2-3 drinks per week",
      "exercise": "Walks 20 minutes, 3x/week",
      "diet_notes": "Working on reducing carbohydrate intake"
    }
  }
}
```

Design rationale:
- **Single `users` collection with `role` field** — aligns with `PRODUCT.md` decision ("single `users` collection stores all roles with role-specific data in nested fields")
- **`user_id` as UUID string** — stable external identifier; `_id` is internal MongoDB ObjectId
- **`patient_profile` nested object** — role-specific data scoped under a namespace; doctors will have `doctor_profile` in Phase C
- **`email` at top level** — shared across roles, used for uniqueness and future auth (Phase E)

### Indexes

```javascript
db.users.createIndex({ user_id: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
```

---

## Backend

### Pydantic schemas (`backend/app/schemas/patient.py`)

```python
class Address(BaseModel):
    street: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""

class EmergencyContact(BaseModel):
    name: str = ""
    relationship: str = ""
    phone: str = ""

class Allergy(BaseModel):
    substance: str
    reaction: str = ""
    documented_date: str = ""

class Condition(BaseModel):
    name: str
    diagnosed_year: int | None = None
    status: str = "active"  # active | resolved | managed
    notes: str = ""

class FamilyHistoryEntry(BaseModel):
    relation: str
    condition: str

class Lifestyle(BaseModel):
    smoking_status: str = "unknown"  # never | former | current | unknown
    smoking_notes: str = ""
    alcohol: str = ""
    exercise: str = ""
    diet_notes: str = ""

class PatientProfileCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[\w\.\-]+@[\w\.\-]+\.\w+$")
    date_of_birth: str | None = None
    sex: str | None = None  # male | female | other
    blood_type: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    phone: str | None = None
    address: Address | None = None
    emergency_contact: EmergencyContact | None = None
    allergies: list[Allergy] = []
    conditions: list[Condition] = []
    family_history: list[FamilyHistoryEntry] = []
    lifestyle: Lifestyle | None = None

class PatientProfileUpdate(BaseModel):
    """All fields optional for partial update."""
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    blood_type: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    phone: str | None = None
    address: Address | None = None
    emergency_contact: EmergencyContact | None = None
    allergies: list[Allergy] | None = None
    conditions: list[Condition] | None = None
    family_history: list[FamilyHistoryEntry] | None = None
    lifestyle: Lifestyle | None = None

class PatientProfileResponse(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    date_of_birth: str | None
    sex: str | None
    blood_type: str | None
    weight_kg: float | None
    height_cm: float | None
    phone: str | None
    address: Address | None
    emergency_contact: EmergencyContact | None
    allergies: list[Allergy]
    conditions: list[Condition]
    family_history: list[FamilyHistoryEntry]
    lifestyle: Lifestyle | None
    created_at: str
    updated_at: str
```

### Repository (`backend/app/repository/patient.py`)

| Function | Description |
|----------|-------------|
| `create_patient(db, data)` | Insert into `users` with `role: "patient"`, auto-generate `user_id` (UUID), set timestamps |
| `get_patient(db, user_id)` | `find_one` by `user_id` where `role: "patient"` |
| `get_patient_by_email(db, email)` | `find_one` by `email` |
| `update_patient(db, user_id, data)` | `update_one` with `$set` on changed fields, update `updated_at` |
| `list_patients(db, skip, limit)` | `find` where `role: "patient"`, sorted by `created_at` desc, with pagination |
| `patient_exists(db, user_id)` | Boolean check for existence |

### Service (`backend/app/service/patient.py`)

| Function | Description |
|----------|-------------|
| `register_patient(db, data)` | Validate email uniqueness, call `create_patient`, return response |
| `get_patient_profile(db, user_id)` | Fetch + map to `PatientProfileResponse`, raise 404 if not found |
| `update_patient_profile(db, user_id, data)` | Validate email uniqueness if changed, call `update_patient` |
| `list_all_patients(db, skip, limit)` | Paginated list, map to response objects |

### API routes (`backend/app/api/patients.py`)

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| `POST` | `/api/patients` | `register_patient` | 201 + `PatientProfileResponse` |
| `GET` | `/api/patients` | `list_all_patients` | `PatientProfileResponse[]` with pagination |
| `GET` | `/api/patients/{patient_id}` | `get_patient_profile` | `PatientProfileResponse` or 404 |
| `PUT` | `/api/patients/{patient_id}` | `update_patient_profile` | `PatientProfileResponse` or 404 |

---

## Frontend

### Profile page (`frontend/src/pages/ProfilePage.tsx`)

Two modes: **view** and **edit**.

**View mode:**
- Card-based layout showing patient demographics at the top
- Sections for: allergies, active conditions, family history, lifestyle, emergency contact
- "Edit Profile" button switches to edit mode

**Edit mode:**
- Form with input fields for all editable profile sections
- Inline validation (required fields, email format)
- "Save" and "Cancel" buttons
- Optimistic UI: show loading state on save, revert on error

### Profile form components

| Component | Purpose |
|-----------|---------|
| `PatientDemographicsForm` | Name, DOB, sex, blood type, weight, height, phone, address |
| `AllergiesEditor` | Add/remove/edit allergy entries (substance, reaction, date) |
| `ConditionsEditor` | Add/remove/edit conditions (name, year, status, notes) |
| `FamilyHistoryEditor` | Add/remove family history entries |
| `LifestyleEditor` | Smoking, alcohol, exercise, diet fields |
| `EmergencyContactForm` | Name, relationship, phone |

### API client (`frontend/src/api/patients.ts`)

```typescript
export async function registerPatient(data: PatientCreateRequest): Promise<PatientProfile> { ... }
export async function getPatient(patientId: string): Promise<PatientProfile> { ... }
export async function updatePatient(patientId: string, data: PatientUpdateRequest): Promise<PatientProfile> { ... }
export async function listPatients(): Promise<PatientProfile[]> { ... }
```

### TypeScript types (`frontend/src/types/patient.ts`)

Mirror backend Pydantic schemas: `PatientProfile`, `PatientCreateRequest`, `PatientUpdateRequest`, `Address`, `EmergencyContact`, `Allergy`, `Condition`, `FamilyHistoryEntry`, `Lifestyle`.

---

## Seed data migration

A one-time script (`backend/scripts/seed_patients.py`) that:

1. Reads existing Markdown files from `data/patients/`
2. Parses structured sections (demographics, conditions, medications, allergies, etc.)
3. Creates patient records in the `users` collection
4. Maps `patient_id` slugs to `user_id` UUIDs and logs the mapping
5. Idempotent — skips patients that already exist (by email or name match)

This ensures the three existing patients (`john_doe`, `jane_smith`, `alex_kumar`) have proper database records on first run.

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/schemas/patient.py` | Pydantic models for patient profile |
| `backend/app/repository/patient.py` | MongoDB CRUD for patients |
| `backend/app/service/patient.py` | Patient business logic |
| `backend/app/api/patients.py` | Patient REST endpoints |
| `backend/scripts/seed_patients.py` | Markdown → DB migration script |
| `frontend/src/pages/ProfilePage.tsx` | Patient profile view/edit page |
| `frontend/src/api/patients.ts` | Patient API client |
| `frontend/src/types/patient.ts` | Patient TypeScript types |
| `frontend/src/components/patient/` | Profile form sub-components |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/router.py` | Mount patient router at `/patients` |
| `init-mongo.js` | Add `users` collection creation and indexes |
| `frontend/src/contexts/PatientContext.tsx` | Source patient list from `GET /api/patients` (DB-backed) |

---

## Implementation steps

1. **Add `users` collection and indexes** to `init-mongo.js`
2. **Create backend schemas** (`schemas/patient.py`)
3. **Create repository layer** (`repository/patient.py`)
4. **Create service layer** (`service/patient.py`)
5. **Create API routes** (`api/patients.py`) and mount in router
6. **Write seed migration script** and run it to populate existing patients
7. **Create frontend types and API client** (`types/patient.ts`, `api/patients.ts`)
8. **Build profile page** with view/edit modes
9. **Update `PatientContext`** to fetch from new `/api/patients` endpoint
10. **Update `service/chat.py` `list_patients`** to optionally query DB instead of filesystem

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Create patient with valid data | API | 201, correct fields returned |
| Create patient with duplicate email | API | 409 conflict |
| Create patient with missing required fields | API | 422 validation error |
| Get patient by ID | API | 200 with full profile |
| Get nonexistent patient | API | 404 |
| Update patient profile | API | 200, fields updated, `updated_at` changed |
| List patients with pagination | API | Correct count, ordering |
| Seed script creates records from Markdown | Script | 3 patients created, idempotent on re-run |
| Profile page renders patient data | Frontend | All sections displayed |
| Profile edit mode saves changes | Frontend | API called, UI updated |

---

*Created: 2026-04-12*
