# Feature 6: Doctor Dashboard

The doctor's home screen — a personalized overview showing connected patient stats, pending connection requests, recent activity (chat sessions, prescriptions), and quick-access patient cards. This is the landing page when a doctor enters the portal at `/doctor`.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 6th (after Patient List & Patient View; can partially overlap)

**Auth:** Dashboard data is loaded using the active dev-selected `doctor_id` from context — **no login or JWT** in this plan (Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)).

---

## Problem

Doctors need a home page that gives them an at-a-glance overview of their practice within the platform:

1. How many patients are connected to them
2. Any pending connection requests that need action
3. Recent activity — latest chat sessions and prescriptions
4. Quick access to frequently viewed patients
5. Professional summary for their own reference

---

## Design

### Dashboard layout

```
┌────────────────────────────────────────────────────────────┐
│  Welcome, Dr. Sarah Chen                                    │
│  Internal Medicine · Bay Area Medical Center                │
├─────────────────────┬──────────────────┬───────────────────┤
│  Connected Patients │ Pending Requests │ Total Rx Written  │
│       12            │       3          │       47          │
│  [View All →]       │  [Review →]      │                   │
├─────────────────────┴──────────────────┴───────────────────┤
│                                                             │
│  ┌─ Pending Connection Requests ──────────────────────────┐ │
│  │  John Doe wants to connect · 2 hours ago               │ │
│  │  [Accept] [Reject]                                     │ │
│  │                                                        │ │
│  │  Jane Smith wants to connect · 1 day ago               │ │
│  │  [Accept] [Reject]                                     │ │
│  │                                                        │ │
│  │  [View All Requests →]                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Recent Patients ─────────────────────────────────────┐  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Alex K.  │  │ John D.  │  │ Jane S.  │           │  │
│  │  │ Male, 35 │  │ Male, 58 │  │ Fem, 42  │           │  │
│  │  │ Last: 2d │  │ Last: 5d │  │ Last: 1w │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  │  [View All Patients →]                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Recent Activity ─────────────────────────────────────┐  │
│  │  💬 Chat with Alex Kumar · 2 days ago                 │  │
│  │     "Reviewed medication interactions for…"            │  │
│  │                                                        │  │
│  │  💊 Prescription for John Doe · 5 days ago            │  │
│  │     Metformin 1000mg — dosage adjustment               │  │
│  │                                                        │  │
│  │  💬 Chat with Jane Smith · 1 week ago                 │  │
│  │     "Analyzed recent lab results…"                     │  │
│  │                                                        │  │
│  │  [View More →]                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Dashboard sections

| Section | Data source | Description |
|---------|-------------|-------------|
| **Welcome banner** | Doctor profile (`users`) | Name, specialization, institution |
| **Stat cards** | Aggregated queries | Connected patients count, pending requests count, total prescriptions |
| **Pending requests** | `connections` (status=pending, recipient=doctor) | Up to 3 most recent; inline accept/reject |
| **Recent patients** | `connections` (active) + last interaction timestamp | Compact patient cards sorted by last interaction |
| **Recent activity** | `chat_sessions` + `prescriptions` | Mixed timeline of recent chats and prescriptions |

---

## Backend

### API endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/doctors/{doctor_id}/dashboard` | Aggregated dashboard data |

### Response schema (`backend/app/schemas/doctor.py` — additions)

```python
class DashboardStats(BaseModel):
    connected_patients: int
    pending_requests: int
    total_prescriptions: int

class PendingRequestSummary(BaseModel):
    connection_id: str
    patient_id: str
    patient_name: str
    initiated_by: str
    initiated_at: str

class RecentPatientSummary(BaseModel):
    patient_id: str
    first_name: str
    last_name: str
    sex: str | None
    age: int | None
    last_interaction: str | None

class RecentActivityItem(BaseModel):
    type: str  # "chat" | "prescription"
    timestamp: str
    patient_id: str
    patient_name: str
    summary: str  # Brief description of the activity

class DoctorDashboardResponse(BaseModel):
    doctor_id: str
    doctor_name: str
    specialization: str
    institution: str | None
    stats: DashboardStats
    pending_requests: list[PendingRequestSummary]
    recent_patients: list[RecentPatientSummary]
    recent_activity: list[RecentActivityItem]
```

### Service (`backend/app/service/doctor_dashboard.py`)

```python
async def get_doctor_dashboard(db, doctor_id: str) -> DoctorDashboardResponse:
    doctor = await doctor_repo.get_doctor(db, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")

    stats = DashboardStats(
        connected_patients=await connection_repo.count_connections(
            db, doctor_id, "doctor", "active"
        ),
        pending_requests=await connection_repo.count_connections(
            db, doctor_id, "doctor", "pending"
        ),
        total_prescriptions=await prescription_repo.count_by_doctor(db, doctor_id),
    )

    pending = await connection_repo.list_connections_for_doctor(
        db, doctor_id, status_filter="pending", skip=0, limit=3
    )
    # Enrich with patient names
    pending_summaries = await enrich_pending_requests(db, pending)

    recent_patients = await get_recent_patients(db, doctor_id, limit=6)
    recent_activity = await get_recent_activity(db, doctor_id, limit=5)

    return DoctorDashboardResponse(
        doctor_id=doctor_id,
        doctor_name=f"{doctor['doctor_profile']['first_name']} {doctor['doctor_profile']['last_name']}",
        specialization=doctor["doctor_profile"]["specialization"],
        institution=doctor["doctor_profile"].get("institution"),
        stats=stats,
        pending_requests=pending_summaries,
        recent_patients=recent_patients,
        recent_activity=recent_activity,
    )
```

The `get_recent_activity` function merges results from `chat_sessions` and `prescriptions` collections, sorted by timestamp descending, limited to the most recent N items.

---

## Frontend

### Dashboard page (`frontend/src/pages/doctor/DoctorDashboardPage.tsx`)

Fetches `GET /api/doctors/{doctorId}/dashboard` on mount. Renders section cards with loading skeleton states.

### Components

| Component | Purpose |
|-----------|---------|
| `DoctorWelcomeBanner` | Doctor name, title, specialization, institution |
| `DashboardStatCards` | Three stat cards in a row (patients, pending, prescriptions) |
| `PendingRequestsCard` | Pending connection requests with inline accept/reject |
| `RecentPatientsCard` | Compact patient cards (click → navigate to patient detail) |
| `RecentActivityCard` | Mixed timeline of chats and prescriptions |
| `ActivityItem` | Single activity entry (icon, description, timestamp) |

### Layout

```
Desktop (≥1024px):           Tablet / Mobile:
┌────┬────┬────┐             ┌──────────────┐
│Stat│Stat│Stat│             │  Stat cards   │
├────┴────┴────┤             │  (stacked)    │
│   Pending    │             ├──────────────┤
│   Requests   │             │   Pending    │
├──────────────┤             ├──────────────┤
│   Recent     │             │   Recent     │
│   Patients   │             │   Patients   │
├──────────────┤             ├──────────────┤
│   Recent     │             │   Recent     │
│   Activity   │             │   Activity   │
└──────────────┘             └──────────────┘
```

### API client addition (`frontend/src/api/doctors.ts`)

```typescript
export async function getDoctorDashboard(doctorId: string): Promise<DoctorDashboardResponse> {
  return apiRequest<DoctorDashboardResponse>(`/doctors/${doctorId}/dashboard`);
}
```

### Custom hook (`frontend/src/hooks/useDoctorDashboard.ts`)

```typescript
export function useDoctorDashboard() {
  const { currentDoctorId } = useIdentityContext();
  const [data, setData] = useState<DoctorDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentDoctorId) return;
    setIsLoading(true);
    getDoctorDashboard(currentDoctorId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [currentDoctorId]);

  return { data, isLoading, error };
}
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/service/doctor_dashboard.py` | Dashboard aggregation service |
| `frontend/src/pages/doctor/DoctorDashboardPage.tsx` | Dashboard page (replaces placeholder) |
| `frontend/src/hooks/useDoctorDashboard.ts` | Data fetching hook |
| `frontend/src/components/doctor/dashboard/DoctorWelcomeBanner.tsx` | Welcome header |
| `frontend/src/components/doctor/dashboard/DashboardStatCards.tsx` | Stat cards row |
| `frontend/src/components/doctor/dashboard/PendingRequestsCard.tsx` | Pending requests with actions |
| `frontend/src/components/doctor/dashboard/RecentPatientsCard.tsx` | Recent patient quick cards |
| `frontend/src/components/doctor/dashboard/RecentActivityCard.tsx` | Activity timeline |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/doctors.py` | Add `GET /{doctor_id}/dashboard` route |
| `backend/app/schemas/doctor.py` | Add dashboard response schemas |
| `frontend/src/types/doctor.ts` | Add dashboard TypeScript types |
| `frontend/src/api/doctors.ts` | Add `getDoctorDashboard()` function |

---

## Implementation steps

1. **Create dashboard response schemas** in `schemas/doctor.py`
2. **Build dashboard aggregation service** (`service/doctor_dashboard.py`)
3. **Add API endpoint** to doctors router
4. **Add frontend types** for dashboard response
5. **Build dashboard components** (welcome banner, stat cards, pending requests, recent patients, recent activity)
6. **Compose `DoctorDashboardPage`** with all components + loading states
7. **Create `useDoctorDashboard` hook** for data fetching
8. **Test with seed data** — verify stats, pending requests, and activity render correctly
9. **Handle empty states** — new doctor with no connections, no activity

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Dashboard endpoint returns aggregated data | API | Stats, pending, recent patients, activity |
| Dashboard for nonexistent doctor | API | 404 |
| Dashboard with no connections | API | Zero stats, empty lists (graceful) |
| Stats reflect correct counts | API | Connected patients, pending requests match DB |
| Pending requests show inline actions | Frontend | Accept/reject buttons work |
| Accept on dashboard updates pending count | Frontend | UI refreshes after action |
| Recent patients click navigates to detail | Frontend | Route change to `/doctor/patients/:id` |
| Recent activity shows chat and prescription items | Frontend | Mixed timeline rendered |
| Dashboard loading skeleton | Frontend | Skeleton shown while fetching |
| Dashboard handles zero-state (new doctor) | Frontend | Friendly empty state messages |

---

*Created: 2026-04-12*
