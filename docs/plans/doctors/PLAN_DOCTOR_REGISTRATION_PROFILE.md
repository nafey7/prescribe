# Feature 2: Doctor Registration & Profile Management

Backend APIs and frontend forms for creating, viewing, and editing **doctor profile records** in MongoDB. This is the core data layer for the doctor portal — every other Phase C feature (connections, patient list, prescriptions, AI chat) references the doctor record created or selected here.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 2nd (after Dev Identity Picker Extension)

## Not authentication (explicitly out of scope here)

Per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md), **signup, login, JWT, password hashing, email verification, and protected routes belong in Phase E**. Here, **"registration" means creating or seeding a `users` / doctor profile document** (professional info, specialization, license) and editing it in the UI — not an authenticated end-user sign-up.

---

## Problem

Today, no doctor records exist in the database. The `users` collection has only patient documents. Phase C needs:

1. Doctor profile documents in the `users` collection with `role: "doctor"`
2. APIs to create, read, update, and list doctors
3. A frontend profile page for viewing and editing professional information
4. Seed data for at least two doctors to enable multi-doctor testing

---

## Data model

### MongoDB collection: `users` (doctor document)

```json
{
  "_id": ObjectId,
  "user_id": "uuid-string",
  "role": "doctor",
  "email": "sarah.chen@example.com",
  "created_at": ISODate,
  "updated_at": ISODate,
  "doctor_profile": {
    "first_name": "Sarah",
    "last_name": "Chen",
    "title": "Dr.",
    "specialization": "Internal Medicine",
    "sub_specializations": ["Endocrinology"],
    "license_number": "MD-2015-CA-78432",
    "license_state": "CA",
    "npi_number": "1234567890",
    "institution": "Bay Area Medical Center",
    "department": "Internal Medicine",
    "years_of_experience": 11,
    "education": [
      {
        "degree": "MD",
        "institution": "Stanford University School of Medicine",
        "year": 2015
      },
      {
        "degree": "Residency, Internal Medicine",
        "institution": "UCSF Medical Center",
        "year": 2018
      }
    ],
    "phone": "+1-555-0200",
    "office_address": {
      "street": "100 Medical Plaza",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    },
    "accepting_new_patients": true,
    "bio": "Board-certified internist with a focus on chronic disease management and preventive care."
  }
}
```

Design rationale:
- **Same `users` collection with `role: "doctor"`** — aligns with `PRODUCT.md` decision ("single `users` collection stores all roles with role-specific data in nested fields")
- **`doctor_profile` nested object** — role-specific data scoped under a namespace; parallel to `patient_profile` in Phase B
- **`email` at top level** — shared across roles, used for uniqueness and future auth
- **Professional fields** — `license_number`, `npi_number`, `specialization` are essential for a healthcare platform; educational and optional for MVP but included for completeness

### Indexes

Existing indexes on `users` already cover the needs:

```javascript
db.users.createIndex({ user_id: 1 }, { unique: true });  // existing
db.users.createIndex({ email: 1 }, { unique: true });     // existing
db.users.createIndex({ role: 1 });                         // existing
```

Optional Phase C addition for doctor-specific queries:

```javascript
db.users.createIndex(
  { "doctor_profile.specialization": 1 },
  { sparse: true }
);
```

---

## Backend

### Pydantic schemas (`backend/app/schemas/doctor.py`)

```python
class OfficeAddress(BaseModel):
    street: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""

class Education(BaseModel):
    degree: str
    institution: str
    year: int | None = None

class DoctorProfileCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[\w\.\-]+@[\w\.\-]+\.\w+$")
    title: str = "Dr."
    specialization: str = Field(..., min_length=1, max_length=200)
    sub_specializations: list[str] = []
    license_number: str | None = None
    license_state: str | None = None
    npi_number: str | None = None
    institution: str | None = None
    department: str | None = None
    years_of_experience: int | None = None
    education: list[Education] = []
    phone: str | None = None
    office_address: OfficeAddress | None = None
    accepting_new_patients: bool = True
    bio: str = ""

class DoctorProfileUpdate(BaseModel):
    """All fields optional for partial update."""
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    title: str | None = None
    specialization: str | None = None
    sub_specializations: list[str] | None = None
    license_number: str | None = None
    license_state: str | None = None
    npi_number: str | None = None
    institution: str | None = None
    department: str | None = None
    years_of_experience: int | None = None
    education: list[Education] | None = None
    phone: str | None = None
    office_address: OfficeAddress | None = None
    accepting_new_patients: bool | None = None
    bio: str | None = None

class DoctorProfileResponse(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    title: str
    specialization: str
    sub_specializations: list[str]
    license_number: str | None
    license_state: str | None
    npi_number: str | None
    institution: str | None
    department: str | None
    years_of_experience: int | None
    education: list[Education]
    phone: str | None
    office_address: OfficeAddress | None
    accepting_new_patients: bool
    bio: str
    created_at: str
    updated_at: str

class DoctorListResponse(BaseModel):
    doctors: list[DoctorProfileResponse]
    total: int
    skip: int
    limit: int

class DoctorInfo(BaseModel):
    """Lightweight doctor info for pickers and cards."""
    id: str
    name: str
    specialization: str
    institution: str | None = None
```

### Repository (`backend/app/repository/doctor.py`)

| Function | Description |
|----------|-------------|
| `create_doctor(db, data)` | Insert into `users` with `role: "doctor"`, auto-generate `user_id` (UUID), set timestamps |
| `get_doctor(db, user_id)` | `find_one` by `user_id` where `role: "doctor"` |
| `get_doctor_by_email(db, email)` | `find_one` by `email` |
| `update_doctor(db, user_id, data)` | `update_one` with `$set` on changed fields, update `updated_at` |
| `list_doctors(db, skip, limit)` | `find` where `role: "doctor"`, sorted by `created_at` desc, with pagination |
| `count_doctors(db)` | Count documents where `role: "doctor"` |
| `doctor_exists(db, user_id)` | Boolean check for existence |

### Service (`backend/app/service/doctor.py`)

| Function | Description |
|----------|-------------|
| `register_doctor(db, data)` | Validate email uniqueness, call `create_doctor`, return response |
| `get_doctor_profile(db, user_id)` | Fetch + map to `DoctorProfileResponse`, raise 404 if not found |
| `update_doctor_profile(db, user_id, data)` | Validate email uniqueness if changed, call `update_doctor` |
| `list_all_doctors(db, skip, limit)` | Paginated list, map to response objects |
| `get_doctors_for_dev(db)` | Return `DoctorInfo[]` for the dev identity picker |

### API routes (`backend/app/api/doctors.py`)

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| `POST` | `/api/doctors` | `register_doctor` | 201 + `DoctorProfileResponse` |
| `GET` | `/api/doctors` | `list_all_doctors` | `DoctorListResponse` with pagination |
| `GET` | `/api/doctors/for-dev` | `get_doctors_for_dev` | `DoctorInfo[]` |
| `GET` | `/api/doctors/{doctor_id}` | `get_doctor_profile` | `DoctorProfileResponse` or 404 |
| `PUT` | `/api/doctors/{doctor_id}` | `update_doctor_profile` | `DoctorProfileResponse` or 404 |

---

## Frontend

### Profile page (`frontend/src/pages/doctor/DoctorProfilePage.tsx`)

Two modes: **view** and **edit** (same pattern as patient profile page).

**View mode:**
- Card-based layout showing doctor's professional information
- Sections: professional summary (name, title, specialization), credentials (license, NPI), institution, education, contact info, bio
- "Edit Profile" button switches to edit mode

**Edit mode:**
- Form with input fields for all editable profile sections
- Inline validation (required fields, email format)
- "Save" and "Cancel" buttons

### Profile form components

| Component | Purpose |
|-----------|---------|
| `DoctorProfessionalForm` | Name, title, specialization, sub-specializations, bio |
| `DoctorCredentialsForm` | License number, state, NPI number |
| `DoctorInstitutionForm` | Institution, department, years of experience |
| `DoctorEducationEditor` | Add/remove education entries (degree, institution, year) |
| `DoctorContactForm` | Phone, office address |

### API client (`frontend/src/api/doctors.ts`)

```typescript
export async function registerDoctor(data: DoctorCreateRequest): Promise<DoctorProfile> { ... }
export async function getDoctor(doctorId: string): Promise<DoctorProfile> { ... }
export async function updateDoctor(doctorId: string, data: DoctorUpdateRequest): Promise<DoctorProfile> { ... }
export async function listDoctors(skip?: number, limit?: number): Promise<DoctorListResponse> { ... }
export async function getDoctorsForDev(): Promise<DoctorInfo[]> { ... }
```

### TypeScript types (`frontend/src/types/doctor.ts`)

Mirror backend Pydantic schemas: `DoctorProfile`, `DoctorCreateRequest`, `DoctorUpdateRequest`, `DoctorInfo`, `Education`, `OfficeAddress`, `DoctorListResponse`.

---

## Seed data

`backend/scripts/seed_doctors.py` creates two doctors:

### Dr. Sarah Chen
- Internal Medicine, Bay Area Medical Center
- MD from Stanford, Residency at UCSF
- License: MD-2015-CA-78432 (CA)
- 11 years experience
- Accepting new patients

### Dr. Michael Rivera
- Cardiology, City Heart Institute
- MD from Johns Hopkins, Cardiology Fellowship at Mayo Clinic
- License: MD-2012-NY-56291 (NY)
- 14 years experience
- Accepting new patients

The script is idempotent — skips doctors that already exist by email match.

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/schemas/doctor.py` | Pydantic models for doctor profile |
| `backend/app/repository/doctor.py` | MongoDB CRUD for doctors |
| `backend/app/service/doctor.py` | Doctor business logic |
| `backend/app/api/doctors.py` | Doctor REST endpoints |
| `backend/scripts/seed_doctors.py` | Seed doctor data |
| `frontend/src/pages/doctor/DoctorProfilePage.tsx` | Doctor profile view/edit page |
| `frontend/src/api/doctors.ts` | Doctor API client |
| `frontend/src/types/doctor.ts` | Doctor TypeScript types |
| `frontend/src/components/doctor/profile/` | Profile form sub-components |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/router.py` | Mount doctor router at `/doctors` |
| `init-mongo.js` | Add optional doctor-specific index (specialization) |
| `frontend/src/contexts/IdentityContext.tsx` | Source doctor list from `GET /api/doctors/for-dev` |

---

## Implementation steps

1. **Create backend schemas** (`schemas/doctor.py`)
2. **Create repository layer** (`repository/doctor.py`)
3. **Create service layer** (`service/doctor.py`)
4. **Create API routes** (`api/doctors.py`) and mount in router
5. **Write seed script** and run it to create test doctors
6. **Create frontend types and API client** (`types/doctor.ts`, `api/doctors.ts`)
7. **Build doctor profile page** with view/edit modes
8. **Wire `IdentityContext`** to fetch doctor list from new endpoint
9. **Test doctor CRUD** end-to-end

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Create doctor with valid data | API | 201, correct fields returned |
| Create doctor with duplicate email | API | 409 conflict |
| Create doctor with missing required fields | API | 422 validation error |
| Get doctor by ID | API | 200 with full profile |
| Get nonexistent doctor | API | 404 |
| Update doctor profile | API | 200, fields updated, `updated_at` changed |
| List doctors with pagination | API | Correct count, ordering |
| Seed script creates records | Script | 2 doctors created, idempotent on re-run |
| Profile page renders doctor data | Frontend | All sections displayed |
| Profile edit mode saves changes | Frontend | API called, UI updated |
| Email uniqueness across roles | API | Cannot reuse a patient's email for a doctor |

---

*Created: 2026-04-12*
