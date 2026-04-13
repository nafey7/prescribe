# Feature 3: Doctor–Patient Connection System

The connection system that lets patients and doctors establish mutual relationships — analogous to a friend request on a social platform. A connection grants the doctor access to the patient's medical history, documents, and the ability to write prescriptions. This is the **gateway** to all doctor–patient interactions in the platform.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 3rd (after Doctor Registration & Profile)

**Auth:** Connection APIs use dev-time identity headers (`X-Doctor-Id`, `X-Patient-Id`) — **no JWT or route guards** in this plan (Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)).

---

## Problem

The product requires that doctors can only access patient data when a mutual connection exists. Today there is no mechanism for:

1. A patient to "add" a doctor (send a connection request)
2. A doctor to "add" a patient (send a connection request)
3. Either party to accept or reject a pending request
4. The system to enforce that only connected doctors can view patient data
5. Either party to remove an existing connection

The connection model is fundamental — **Features 5–8** (patient list, patient view, AI chat, prescriptions) all depend on connections to determine access.

---

## Connection lifecycle

```
Patient sends request to Doctor          Doctor sends request to Patient
         │                                          │
         ▼                                          ▼
   ┌──────────┐                              ┌──────────┐
   │ PENDING  │                              │ PENDING  │
   │ (doctor  │                              │ (patient │
   │  decides)│                              │  decides)│
   └────┬─────┘                              └────┬─────┘
        │                                         │
   ┌────┴────┐                               ┌────┴────┐
   │         │                               │         │
   ▼         ▼                               ▼         ▼
ACCEPTED  REJECTED                        ACCEPTED  REJECTED
   │         │                               │         │
   ▼         ▼                               ▼         ▼
ACTIVE    (deleted                        ACTIVE    (deleted
   │       or kept                           │       or kept
   │       for audit)                        │       for audit)
   │                                         │
   ▼                                         ▼
REMOVED (either party can disconnect)     REMOVED (either party can disconnect)
```

### Connection statuses

| Status | Meaning | Who can transition |
|--------|---------|-------------------|
| `pending` | Request sent, waiting for response | Recipient accepts/rejects; sender can cancel |
| `active` | Both parties agreed — doctor has access | Either party can remove |
| `rejected` | Recipient declined the request | Sender can send a new request later |
| `cancelled` | Sender withdrew before recipient acted | Sender can send a new request later |
| `removed` | Previously active connection was dissolved | Either party can send a new request later |

---

## Data model

### MongoDB collection: `connections`

```json
{
  "_id": ObjectId,
  "connection_id": "uuid-string",
  "doctor_id": "uuid-string",
  "patient_id": "uuid-string",
  "status": "pending",
  "initiated_by": "patient",
  "initiated_at": ISODate,
  "responded_at": ISODate,
  "removed_at": ISODate,
  "removed_by": "doctor",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

Field details:
- **`connection_id`** — UUID, external identifier
- **`doctor_id`** — `user_id` of the doctor
- **`patient_id`** — `user_id` of the patient
- **`status`** — one of: `pending`, `active`, `rejected`, `cancelled`, `removed`
- **`initiated_by`** — `"patient"` or `"doctor"` — who sent the request
- **`initiated_at`** — when the request was created
- **`responded_at`** — when the request was accepted/rejected (null if still pending)
- **`removed_at`** / **`removed_by`** — dissolution metadata (null if not removed)

### Indexes

```javascript
db.createCollection("connections");
db.connections.createIndex({ connection_id: 1 }, { unique: true });
db.connections.createIndex({ doctor_id: 1, status: 1 });
db.connections.createIndex({ patient_id: 1, status: 1 });
db.connections.createIndex(
  { doctor_id: 1, patient_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "active"] } } }
);
```

The compound unique index with partial filter prevents duplicate pending or active connections between the same doctor–patient pair while allowing historical records (rejected, cancelled, removed).

### Business rules

1. **One active connection per pair** — a doctor and patient can have at most one `pending` or `active` connection at any time
2. **Mutual consent** — a connection only becomes `active` when the recipient accepts
3. **Either party initiates** — both patients and doctors can send connection requests
4. **Either party removes** — both patients and doctors can dissolve an active connection
5. **Re-request allowed** — after rejection, cancellation, or removal, a new request can be sent
6. **No self-connection** — cannot send a request to yourself (defensive check)
7. **Existence check** — both doctor and patient must exist as valid users before a connection can be created

---

## Backend

### Pydantic schemas (`backend/app/schemas/connection.py`)

```python
class ConnectionRequest(BaseModel):
    doctor_id: str
    patient_id: str
    initiated_by: Literal["patient", "doctor"]

class ConnectionResponse(BaseModel):
    connection_id: str
    doctor_id: str
    patient_id: str
    status: str
    initiated_by: str
    initiated_at: str
    responded_at: str | None
    doctor_name: str | None = None
    patient_name: str | None = None

class ConnectionListResponse(BaseModel):
    connections: list[ConnectionResponse]
    total: int
```

### Repository (`backend/app/repository/connection.py`)

| Function | Description |
|----------|-------------|
| `create_connection(db, data)` | Insert with `status: "pending"`, auto-generate `connection_id` |
| `get_connection(db, connection_id)` | `find_one` by `connection_id` |
| `get_active_connection(db, doctor_id, patient_id)` | Find the `active` connection between a pair |
| `get_pending_or_active(db, doctor_id, patient_id)` | Check if a `pending` or `active` connection exists |
| `update_connection_status(db, connection_id, status, extra_fields)` | Update status + metadata (responded_at, removed_at, etc.) |
| `list_connections_for_doctor(db, doctor_id, status_filter, skip, limit)` | Paginated list for a doctor |
| `list_connections_for_patient(db, patient_id, status_filter, skip, limit)` | Paginated list for a patient |
| `list_connected_patients(db, doctor_id)` | Return patient_ids for all `active` connections |
| `is_connected(db, doctor_id, patient_id)` | Boolean: does an `active` connection exist? |
| `count_connections(db, user_id, role, status)` | Count for pagination and dashboard stats |

### Service (`backend/app/service/connection.py`)

| Function | Description |
|----------|-------------|
| `send_connection_request(db, doctor_id, patient_id, initiated_by)` | Validate users exist, check no duplicate pending/active, create connection |
| `accept_connection(db, connection_id, accepting_user_id)` | Validate the accepting user is the recipient, transition `pending` → `active` |
| `reject_connection(db, connection_id, rejecting_user_id)` | Validate the rejecting user is the recipient, transition `pending` → `rejected` |
| `cancel_connection(db, connection_id, cancelling_user_id)` | Validate the cancelling user is the sender, transition `pending` → `cancelled` |
| `remove_connection(db, connection_id, removing_user_id)` | Validate the user is part of the connection, transition `active` → `removed` |
| `get_doctor_connections(db, doctor_id, status, skip, limit)` | List with enriched names |
| `get_patient_connections(db, patient_id, status, skip, limit)` | List with enriched names |
| `get_connected_patients(db, doctor_id)` | Patient list for doctor portal |
| `verify_connection(db, doctor_id, patient_id)` | Raise 403 if not connected — reusable guard for Features 5–8 |

#### `verify_connection` — the access guard

This function is the **single enforcement point** for connection-based access. Every doctor API that touches patient data calls it:

```python
async def verify_connection(db, doctor_id: str, patient_id: str) -> None:
    connected = await connection_repo.is_connected(db, doctor_id, patient_id)
    if not connected:
        raise HTTPException(
            status_code=403,
            detail="No active connection with this patient",
        )
```

Features 5 (patient view), 7 (AI chat), and 8 (prescriptions) all depend on this function.

### API routes (`backend/app/api/connections.py`)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `POST` | `/api/connections/request` | `send_connection_request` | Body: `ConnectionRequest`; 201 on success |
| `PUT` | `/api/connections/{connection_id}/accept` | `accept_connection` | Accepting user from `X-Doctor-Id` or `X-Patient-Id` |
| `PUT` | `/api/connections/{connection_id}/reject` | `reject_connection` | Rejecting user from header |
| `DELETE` | `/api/connections/{connection_id}` | `cancel_or_remove` | Cancel if `pending` (by sender), remove if `active` (by either) |
| `GET` | `/api/doctors/{doctor_id}/connections` | `get_doctor_connections` | Query: `status` filter, `skip`, `limit` |
| `GET` | `/api/patients/{patient_id}/connections` | `get_patient_connections` | Query: `status` filter, `skip`, `limit` |
| `GET` | `/api/doctors/{doctor_id}/patients` | `get_connected_patients` | Active connections only — returns enriched patient summaries |

#### Error responses

| Scenario | Status | Detail |
|----------|--------|--------|
| Duplicate pending/active connection | 409 | "A connection already exists between this doctor and patient" |
| User not found (doctor or patient) | 404 | "Doctor not found" / "Patient not found" |
| Not the recipient (accept/reject) | 403 | "Only the recipient can accept/reject this request" |
| Not the sender (cancel) | 403 | "Only the sender can cancel this request" |
| Invalid status transition | 400 | "Connection is not in pending status" |
| Not part of connection (remove) | 403 | "You are not part of this connection" |

---

## Frontend

### Patient-side: My Doctors page (`frontend/src/pages/PatientConnectionsPage.tsx`)

Route: `/connections` (under `PatientLayout`)

```
┌─────────────────────────────────────────────────┐
│  My Doctors                 [+ Add Doctor]       │
├─────────────────────────────────────────────────┤
│  Pending Requests (2)                            │
│  ┌─────────────────────────────────────────┐     │
│  │  Dr. Sarah Chen — Internal Medicine     │     │
│  │  Bay Area Medical Center                │     │
│  │  Sent by you · 2 days ago               │     │
│  │  [Cancel Request]                       │     │
│  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────┐     │
│  │  Dr. Michael Rivera — Cardiology        │     │
│  │  City Heart Institute                   │     │
│  │  Sent by doctor · 1 day ago             │     │
│  │  [Accept] [Reject]                      │     │
│  └─────────────────────────────────────────┘     │
├─────────────────────────────────────────────────┤
│  Connected Doctors (1)                           │
│  ┌─────────────────────────────────────────┐     │
│  │  Dr. James Park — Family Medicine       │     │
│  │  Connected since Jan 15, 2026           │     │
│  │  [Remove Connection]                    │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Add Doctor flow:**
1. Click "Add Doctor" → modal opens with doctor search (name or specialization)
2. Search hits `GET /api/doctors?search=query`
3. Select doctor → sends `POST /api/connections/request` with `initiated_by: "patient"`
4. Doctor appears in "Pending Requests" section

### Doctor-side: Connections page (`frontend/src/pages/doctor/DoctorConnectionsPage.tsx`)

Route: `/doctor/connections` (under `DoctorLayout`)

```
┌─────────────────────────────────────────────────┐
│  Connection Requests              [+ Add Patient]│
├─────────────────────────────────────────────────┤
│  Pending (3)                                     │
│  ┌─────────────────────────────────────────┐     │
│  │  John Doe — Male, 58                    │     │
│  │  Sent by patient · 3 hours ago          │     │
│  │  [Accept] [Reject]                      │     │
│  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────┐     │
│  │  Jane Smith — Female, 42                │     │
│  │  Sent by you · 1 day ago                │     │
│  │  [Cancel Request]                       │     │
│  └─────────────────────────────────────────┘     │
├─────────────────────────────────────────────────┤
│  Active Connections (5)                          │
│  ┌──────────────────────────────────────┐        │
│  │  Alex Kumar — Male, 35               │        │
│  │  Connected since Dec 10, 2025        │        │
│  │  [View Patient] [Remove]             │        │
│  └──────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

**Add Patient flow:**
1. Click "Add Patient" → modal with patient search (name or email)
2. Search hits `GET /api/patients?search=query`
3. Select patient → sends `POST /api/connections/request` with `initiated_by: "doctor"`
4. Patient appears in "Pending" section

### Components

| Component | Purpose |
|-----------|---------|
| `ConnectionCard` | Displays a connection with actions based on status and user role |
| `ConnectionActionButtons` | Accept/Reject/Cancel/Remove buttons with confirmation dialogs |
| `AddDoctorModal` | Patient-side: search and request a doctor |
| `AddPatientModal` | Doctor-side: search and request a patient |
| `DoctorSearchResults` | Search result list showing doctor cards |
| `PatientSearchResults` | Search result list showing patient cards |
| `ConnectionStatusBadge` | Color-coded badge (pending=yellow, active=green, etc.) |

### API client (`frontend/src/api/connections.ts`)

```typescript
export async function sendConnectionRequest(
  doctorId: string,
  patientId: string,
  initiatedBy: "patient" | "doctor"
): Promise<ConnectionResponse> { ... }

export async function acceptConnection(connectionId: string): Promise<ConnectionResponse> { ... }
export async function rejectConnection(connectionId: string): Promise<ConnectionResponse> { ... }
export async function cancelOrRemoveConnection(connectionId: string): Promise<void> { ... }

export async function getDoctorConnections(
  doctorId: string,
  options?: { status?: string; skip?: number; limit?: number }
): Promise<ConnectionListResponse> { ... }

export async function getPatientConnections(
  patientId: string,
  options?: { status?: string; skip?: number; limit?: number }
): Promise<ConnectionListResponse> { ... }

export async function getConnectedPatients(doctorId: string): Promise<PatientSummary[]> { ... }
```

### TypeScript types (`frontend/src/types/connection.ts`)

```typescript
export type ConnectionStatus = "pending" | "active" | "rejected" | "cancelled" | "removed";

export interface ConnectionResponse {
  connection_id: string;
  doctor_id: string;
  patient_id: string;
  status: ConnectionStatus;
  initiated_by: "patient" | "doctor";
  initiated_at: string;
  responded_at: string | null;
  doctor_name?: string;
  patient_name?: string;
}

export interface ConnectionListResponse {
  connections: ConnectionResponse[];
  total: number;
}
```

---

## Seed connections

The seed script (`backend/scripts/seed_connections.py`) creates pre-established connections for testing:

| Doctor | Patient | Status |
|--------|---------|--------|
| Dr. Sarah Chen | John Doe | `active` |
| Dr. Sarah Chen | Jane Smith | `active` |
| Dr. Michael Rivera | John Doe | `pending` (initiated by doctor) |
| Dr. Michael Rivera | Alex Kumar | `active` |

This gives testers immediate connected-patient data to work with in Features 5–8.

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/schemas/connection.py` | Connection Pydantic models |
| `backend/app/repository/connection.py` | MongoDB CRUD for connections |
| `backend/app/service/connection.py` | Connection business logic + `verify_connection` guard |
| `backend/app/api/connections.py` | Connection REST endpoints |
| `backend/scripts/seed_connections.py` | Seed connection data |
| `frontend/src/pages/PatientConnectionsPage.tsx` | Patient "My Doctors" page |
| `frontend/src/pages/doctor/DoctorConnectionsPage.tsx` | Doctor connections management page |
| `frontend/src/api/connections.ts` | Connection API client |
| `frontend/src/types/connection.ts` | Connection TypeScript types |
| `frontend/src/components/connections/ConnectionCard.tsx` | Connection display card |
| `frontend/src/components/connections/AddDoctorModal.tsx` | Patient → doctor search + request |
| `frontend/src/components/connections/AddPatientModal.tsx` | Doctor → patient search + request |
| `frontend/src/components/connections/ConnectionStatusBadge.tsx` | Status badge component |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/router.py` | Mount connections router |
| `init-mongo.js` | Add `connections` collection and indexes |
| `frontend/src/router.tsx` | Add `/connections` (patient) and `/doctor/connections` routes |
| `frontend/src/components/Sidebar.tsx` | Add "My Doctors" nav item for patients |

---

## Implementation steps

1. **Add `connections` collection and indexes** to `init-mongo.js`
2. **Create backend schemas** (`schemas/connection.py`)
3. **Create repository layer** (`repository/connection.py`)
4. **Create service layer** (`service/connection.py`) including `verify_connection` guard
5. **Create API routes** (`api/connections.py`) and mount in router
6. **Write seed script** and run it
7. **Create frontend types and API client** (`types/connection.ts`, `api/connections.ts`)
8. **Build `ConnectionCard` and `ConnectionStatusBadge`** components
9. **Build `AddDoctorModal`** (patient side) with doctor search
10. **Build `AddPatientModal`** (doctor side) with patient search
11. **Build patient connections page** (`PatientConnectionsPage`)
12. **Build doctor connections page** (`DoctorConnectionsPage`)
13. **Add routes and sidebar navigation** for both portals
14. **Test full connection lifecycle** — request, accept, reject, cancel, remove

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Send connection request (patient → doctor) | API | 201, connection created with `pending` status |
| Send connection request (doctor → patient) | API | 201, correct `initiated_by` |
| Duplicate request when pending exists | API | 409 conflict |
| Duplicate request when active exists | API | 409 conflict |
| Accept pending request | API | Status transitions to `active` |
| Accept by wrong user | API | 403 forbidden |
| Reject pending request | API | Status transitions to `rejected` |
| Cancel pending request by sender | API | Status transitions to `cancelled` |
| Remove active connection | API | Status transitions to `removed` |
| List doctor connections with status filter | API | Correct filtering |
| List connected patients (active only) | API | Only active connections returned |
| `verify_connection` passes for connected pair | Service | No exception |
| `verify_connection` fails for non-connected pair | Service | 403 raised |
| Re-request after rejection | API | New connection created successfully |
| Patient connections page renders pending and active | Frontend | UI completeness |
| Doctor connections page renders pending and active | Frontend | UI completeness |
| Accept/reject buttons work | Frontend | Status updates in UI |
| Add doctor modal searches and sends request | Frontend | End-to-end flow |

---

*Created: 2026-04-12*
