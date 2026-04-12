# Feature 1: Dev Identity Picker Extension

Extends the existing Phase B dev identity picker to support **role switching** (patient ↔ doctor) and doctor identity selection. This is the prerequisite for all other Phase C features — without it, there is no way to simulate "current doctor" during development.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 1st (prerequisite for all other Phase C features)

**Auth:** This plan intentionally does **not** cover login, JWT, or route guards — those are Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md). This feature extends the agreed dev stand-in.

---

## Problem

The Phase B dev identity picker supports only patients: a single `PatientContext` provider, an `X-Patient-Id` header, and a `DevIdentityBanner` that shows "DEV MODE — Acting as: [Patient Name]". Phase C introduces a second role (doctor) with its own set of APIs, UI, and identity needs:

1. The dev picker must support switching between **patient mode** and **doctor mode**
2. In doctor mode, a doctor identity must be selectable (analogous to patient selection)
3. Doctor-scoped APIs need an `X-Doctor-Id` header (parallel to `X-Patient-Id`)
4. The frontend router must know the current role to show the correct portal (patient vs. doctor)
5. The mechanism must remain clearly dev-only and replaceable by JWT in Phase E

---

## Design

### Role context model

Introduce an `IdentityContext` that wraps the existing `PatientContext` and adds role awareness:

```
IdentityContext
├── currentRole: "patient" | "doctor"
├── currentDoctorId: string | null
├── currentDoctor: DoctorInfo | null
├── doctors: DoctorInfo[]
├── setCurrentRole(role)
├── setCurrentDoctorId(id)
└── PatientContext (existing — unchanged)
    ├── currentPatientId
    ├── currentPatient
    ├── patients
    └── setCurrentPatientId(id)
```

`PatientContext` is **not** removed or merged — it continues to function as before. `IdentityContext` adds a layer above it for role and doctor selection.

### Backend

#### New dependency: `get_current_doctor_id`

```python
# backend/app/api/dependencies.py (extend existing file)

async def get_current_doctor_id(
    x_doctor_id: str | None = Header(None),
) -> str:
    if not x_doctor_id:
        raise HTTPException(
            status_code=400,
            detail="X-Doctor-Id header is required",
        )
    return x_doctor_id
```

Parallel to the existing `get_current_patient_id`. In Phase E, both are replaced with JWT extraction — single point of change.

#### New endpoint: doctor list for dev picker

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/doctors/for-dev` | `DoctorInfo[]` — doctor list for the dev identity picker |

Response shape mirrors `PatientInfo`:

```python
class DoctorInfo(BaseModel):
    id: str          # doctor user_id (UUID)
    name: str        # "Dr. Sarah Chen"
    specialization: str  # "Internal Medicine"
```

### Frontend

#### `IdentityContext` (`frontend/src/contexts/IdentityContext.tsx`)

```typescript
interface IdentityState {
  currentRole: "patient" | "doctor";
  currentDoctorId: string | null;
  currentDoctor: DoctorInfo | null;
  doctors: DoctorInfo[];
  isDoctorsLoading: boolean;
  setCurrentRole: (role: "patient" | "doctor") => void;
  setCurrentDoctorId: (id: string) => void;
}
```

- Persists `currentRole` and `currentDoctorId` in `localStorage`
- Fetches doctor list from `GET /api/doctors/for-dev` on mount
- When `currentRole` is `"doctor"`, the router renders `DoctorLayout` routes
- When `currentRole` is `"patient"`, the router renders `PatientLayout` routes (existing behavior)

#### Updated `DevIdentityBanner`

The banner expands to show role and identity:

```
┌──────────────────────────────────────────────────────────────────┐
│  🔧 DEV MODE — Role: [Patient ▾ | Doctor ▾]  Acting as: [Name ▾]  │
└──────────────────────────────────────────────────────────────────┘
```

- **Role toggle:** Dropdown or segmented control to switch between "Patient" and "Doctor"
- **Identity selector:** When role is "Patient", shows patient dropdown (existing). When role is "Doctor", shows doctor dropdown
- Switching role navigates to the appropriate portal root (`/` for patient, `/doctor` for doctor)
- Amber background preserved; slightly wider to accommodate role controls

#### Updated API client (`frontend/src/api/client.ts`)

The shared `apiFetch()` function is extended to inject **both** headers when available:

- `X-Patient-Id` — always sent when a patient is selected (existing behavior)
- `X-Doctor-Id` — sent when the current role is `"doctor"` and a doctor is selected

Individual API modules choose which headers are relevant for their requests.

#### Router update

```tsx
// frontend/src/router.tsx (conceptual)
export const router = createBrowserRouter([
  // Patient portal (existing)
  {
    path: "/",
    element: <PatientLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "connections", element: <PatientConnectionsPage /> },
      { path: "prescriptions", element: <PatientPrescriptionsPage /> },
    ],
  },
  // Doctor portal (new in Phase C)
  {
    path: "/doctor",
    element: <DoctorLayout />,
    children: [
      { index: true, element: <DoctorDashboardPage /> },
      { path: "profile", element: <DoctorProfilePage /> },
      { path: "patients", element: <DoctorPatientListPage /> },
      { path: "patients/:patientId", element: <DoctorPatientDetailPage /> },
      { path: "patients/:patientId/chat", element: <DoctorChatPage /> },
      { path: "patients/:patientId/prescriptions", element: <DoctorPrescriptionsPage /> },
      { path: "connections", element: <DoctorConnectionsPage /> },
    ],
  },
  // Public chat retired or kept as legacy redirect
  { path: "/public/chat", element: <Navigate to="/doctor" replace /> },
]);
```

---

## Seed data

Phase C needs at least **2 seed doctors** for testing multi-doctor scenarios:

| Doctor | Specialization | Email |
|--------|---------------|-------|
| Dr. Sarah Chen | Internal Medicine | sarah.chen@example.com |
| Dr. Michael Rivera | Cardiology | michael.rivera@example.com |

Created via `backend/scripts/seed_doctors.py` (similar to `seed_patients.py`).

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `frontend/src/contexts/IdentityContext.tsx` | Role + doctor identity context provider |
| `frontend/src/api/doctors.ts` | Doctor API client (starts with `getDoctorsForDev`) |
| `frontend/src/types/doctor.ts` | `DoctorInfo` and related TypeScript types |
| `backend/scripts/seed_doctors.py` | Seed doctor profiles for dev/testing |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/dependencies.py` | Add `get_current_doctor_id` dependency |
| `frontend/src/components/DevIdentityBanner.tsx` | Add role toggle + doctor selector |
| `frontend/src/api/client.ts` | Inject `X-Doctor-Id` header when doctor role is active |
| `frontend/src/App.tsx` | Wrap with `IdentityProvider` above `PatientProvider` |
| `frontend/src/router.tsx` | Add doctor route tree; role-based rendering |

---

## Implementation steps

1. **Add `get_current_doctor_id`** to `backend/app/api/dependencies.py`
2. **Create `DoctorInfo` schema** in `backend/app/schemas/doctor.py` (or reuse in Feature 2)
3. **Add `GET /api/doctors/for-dev`** endpoint returning seed doctors
4. **Create seed script** `backend/scripts/seed_doctors.py` and run it
5. **Create `IdentityContext`** with role switching and doctor selection
6. **Create `DoctorInfo` TypeScript type** and `doctors.ts` API client
7. **Update `DevIdentityBanner`** with role toggle and doctor dropdown
8. **Update `api/client.ts`** to inject `X-Doctor-Id` when in doctor mode
9. **Update `router.tsx`** with doctor route stubs (placeholder pages)
10. **Update `App.tsx`** to wrap with `IdentityProvider`
11. **Test role switching** — verify patient portal and doctor portal are accessible via role toggle

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Doctor endpoint without `X-Doctor-Id` header | API | Returns 400 |
| Doctor endpoint with valid `X-Doctor-Id` header | API | Returns 200 |
| `GET /api/doctors/for-dev` returns doctor list | API | Seed data present |
| Role toggle switches between patient and doctor | Frontend | UI renders correct portal |
| Doctor selector updates `X-Doctor-Id` on API calls | Frontend | Header propagation |
| `localStorage` persists role and doctor selection | Frontend | Survives page refresh |
| Patient context still works in patient mode | Frontend | No regression |

---

## Phase E migration path

When auth ships:
1. Replace `get_current_doctor_id` body with JWT extraction + role check
2. Remove role toggle from `DevIdentityBanner` — role is derived from the authenticated user
3. `IdentityContext` sources role and identity from auth session
4. Router uses auth-derived role for portal selection

---

*Created: 2026-04-12*
