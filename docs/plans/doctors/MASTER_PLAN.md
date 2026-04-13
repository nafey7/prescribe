# Phase C — Doctor Experience: Master Plan

Phase C delivers the **complete doctor-facing experience** — everything a clinician needs to connect with patients, view their medical records, write prescriptions, and use the AI assistant. It builds on the Phase B patient infrastructure and prepares the platform for admin tooling in Phase D.

**Reference:** [`PRODUCT.md`](../../PRODUCT.md) · [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)

**Identity note:** Everything under `docs/plans/doctors/` implements **Phase C (doctor-facing features) only**. **Authentication is not part of these documents** — no signup, login, JWT, sessions, password handling, or production-style route/API protection. That work is **Phase E**, sequenced **after** admin surfaces, per the [product build order](../PLAN_PRODUCT_BUILD_ORDER.md). Until then, the [dev identity picker extension](./PLAN_DEV_IDENTITY_DOCTOR_EXTENSION.md) simulates the current doctor so features are testable without auth.

**AI chat ownership change:** The existing AI chat at `/public/chat` was built as a prototype. Per [`PRODUCT.md`](../../PRODUCT.md), AI chat is **doctor-only** — patients do not interact with the AI assistant. Phase C migrates AI chat under the doctor experience, scoped to connected patients. The `/public/chat` route is retired or repurposed. Details: [Doctor AI Chat](./PLAN_DOCTOR_AI_CHAT.md).

---

## Business context

From the product vision, the doctor role centers on **pillars 2–4**:

- **Pillar 2: Doctor–patient connections** — Doctors and patients establish relationships by sending and accepting connection requests, similar to a social network. A connection grants the doctor access to the patient's medical history.
- **Pillar 3: Prescription management** — Connected doctors can view a patient's full history and write new prescriptions grounded in that context.
- **Pillar 4: AI assistant (doctor-only)** — An AI layer, accessible only to doctors, has access to a connected patient's medical history documents. Doctors chat with the AI to get summaries, ask health-related questions, and navigate large records quickly.

Since authentication ships in Phase E, Phase C uses an **extended dev identity picker** to simulate the current doctor. All APIs and UI are designed so that `user_id` / `doctor_id` can be wired to a real JWT identity later without a rewrite.

---

## Feature inventory (all Phase C features)

| # | Feature | Scope | Detailed plan |
|---|---------|-------|---------------|
| 1 | Dev Identity Picker Extension | Extend existing dev picker to support role switching (patient ↔ doctor), doctor identity context, and `X-Doctor-Id` header for doctor-scoped APIs | [`PLAN_DEV_IDENTITY_DOCTOR_EXTENSION.md`](./PLAN_DEV_IDENTITY_DOCTOR_EXTENSION.md) |
| 2 | Doctor Registration & Profile Management | Backend APIs + frontend forms for **doctor profile records** (specialization, license, contact info) in MongoDB — **not** signup/login; profile-creation API for dev/testing | [`PLAN_DOCTOR_REGISTRATION_PROFILE.md`](./PLAN_DOCTOR_REGISTRATION_PROFILE.md) |
| 3 | Doctor–Patient Connection System | Connection request model (send, accept, reject, remove), mutual connections, backend enforcement of connection-based access, patient-side connection management | [`PLAN_DOCTOR_PATIENT_CONNECTIONS.md`](./PLAN_DOCTOR_PATIENT_CONNECTIONS.md) |
| 4 | Doctor UI Shell & Navigation | Doctor portal layout, routing (React Router), sidebar navigation, responsive design, role-based route splitting between patient and doctor portals | [`PLAN_DOCTOR_UI_SHELL.md`](./PLAN_DOCTOR_UI_SHELL.md) |
| 5 | Doctor's Patient List & Patient View | Doctor-facing list of connected patients with search/filter, and a read-only view of a connected patient's profile, dashboard data, and documents | [`PLAN_DOCTOR_PATIENT_LIST_VIEW.md`](./PLAN_DOCTOR_PATIENT_LIST_VIEW.md) |
| 6 | Doctor Dashboard | Doctor's home screen with connected patient count, recent activity, pending connection requests, quick-access patient cards | [`PLAN_DOCTOR_DASHBOARD.md`](./PLAN_DOCTOR_DASHBOARD.md) |
| 7 | Doctor AI Chat | Doctor-scoped AI chat tied to connected patients — migrate existing chat to doctor experience, enforce connection checks, patient-context selector within doctor portal | [`PLAN_DOCTOR_AI_CHAT.md`](./PLAN_DOCTOR_AI_CHAT.md) |
| 8 | Prescription Management | Doctors create, view, and manage prescriptions for connected patients only — stored in MongoDB, visible on both doctor and patient dashboards | [`PLAN_PRESCRIPTION_MANAGEMENT.md`](./PLAN_PRESCRIPTION_MANAGEMENT.md) |

---

## Phase C scope boundaries

### In scope

- Doctor CRUD (create, read, update profile) backed by MongoDB `users` collection with `role: "doctor"`
- Doctor–patient connection request system (send, accept, reject, cancel, remove)
- Connection-based access enforcement at the service layer (doctor can only view data of connected patients)
- Doctor portal UI: dashboard, patient list, patient detail view, AI chat, prescriptions
- Role-based routing: `/doctor/*` routes under `DoctorLayout`, `/patient/*` (or existing `/`) for patients
- Dev-mode role and identity picker (switch between patient and doctor, select specific identity)
- AI chat migration from public prototype to doctor-only, scoped to connected patients
- Prescription creation and management for connected patients
- Backend API design that accepts `doctor_id` resolved from dev header or future JWT

### Out of scope (deferred)

- Authentication, JWT, route protection (Phase E)
- Admin management of doctor accounts (Phase D)
- Real-time notifications for connection requests
- Video consultations or real-time messaging
- E-prescribing integrations (DEA, state PMP)
- FHIR/HL7 integration
- Doctor scheduling / appointment booking
- Insurance / billing integration
- Multi-facility / organization management

---

## Dependency graph

```
Feature 1: Dev Identity Picker Extension
    ↓ (provides simulated doctor_id and role switching to all features)
Feature 2: Doctor Registration & Profile
    ↓ (doctor records must exist before connections can be established)
Feature 3: Doctor–Patient Connection System
    ↓ (connections are the gateway to all patient data access)
Feature 4: Doctor UI Shell & Navigation
    ↓ (routing and layout needed for all doctor pages)
Feature 5: Doctor's Patient List & Patient View
    ↓ (patient list is the primary navigation to patient data)
Feature 6: Doctor Dashboard
    ↓ (dashboard aggregates connection and activity data)
Feature 7: Doctor AI Chat
    ↓ (AI chat requires connection checks and patient context)
Feature 8: Prescription Management
```

**Recommended build order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

Features 4 (UI shell) and 3 (connections) can partially overlap since the shell is independent of connection API logic. Feature 5 (patient list/view) depends on connections existing to show connected patients. Feature 6 (dashboard) can develop in parallel with Feature 5 since they share similar data queries. Feature 7 (AI chat) depends on connections for access control and the UI shell for routing. Feature 8 (prescriptions) depends on connections and is the last major feature.

---

## MongoDB collections touched

| Collection | Status | Phase C changes |
|------------|--------|-----------------|
| `users` | Existing | Add doctor profile documents (`role: "doctor"`, specialization, license, institution) |
| `connections` | **New** | Doctor–patient connection requests and active connections (doctor_id, patient_id, status, timestamps) |
| `prescriptions` | **New** | Doctor-created prescriptions (doctor_id, patient_id, medications, diagnosis, notes, timestamps) |
| `chat_sessions` | Existing | Add `doctor_id` field; scope sessions to doctor–patient pairs |
| `chat_messages` | Existing | Add `doctor_id` field for attribution |
| `documents` | Existing | No structural changes; doctors read patient documents via connection-based access |

---

## API surface (Phase C additions)

Path segment `{doctor_id}` means the doctor's `user_id` (UUID). Path segment `{patient_id}` means the patient's `user_id` (UUID) or `patient_slug`.

### Doctor profile APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/doctors` | Create doctor profile |
| `GET` | `/api/doctors` | Paginated doctor list |
| `GET` | `/api/doctors/{doctor_id}` | Get doctor profile |
| `PUT` | `/api/doctors/{doctor_id}` | Update doctor profile |

### Connection APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/connections/request` | Send connection request (doctor → patient or patient → doctor) |
| `PUT` | `/api/connections/{connection_id}/accept` | Accept pending request |
| `PUT` | `/api/connections/{connection_id}/reject` | Reject pending request |
| `DELETE` | `/api/connections/{connection_id}` | Cancel pending request or remove active connection |
| `GET` | `/api/doctors/{doctor_id}/connections` | List doctor's connections (filter by status) |
| `GET` | `/api/patients/{patient_id}/connections` | List patient's connections (filter by status) |
| `GET` | `/api/doctors/{doctor_id}/patients` | List doctor's connected patients (active connections only) |

### Doctor patient-view APIs (read-only, connection-gated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/profile` | View connected patient's profile |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/medical-history` | View connected patient's medical history |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents` | List connected patient's documents |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents/{document_id}` | Download/view connected patient's document |

### Doctor AI chat APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/doctors/{doctor_id}/chat/message` | Send message (non-streaming), scoped to connected patient via `X-Patient-Id` |
| `POST` | `/api/doctors/{doctor_id}/chat/message/stream` | Send message (streaming SSE), scoped to connected patient |
| `GET` | `/api/doctors/{doctor_id}/chat/history/{chat_id}` | Chat history |
| `GET` | `/api/doctors/{doctor_id}/chat/sessions` | List doctor's chat sessions (optional patient filter) |

### Prescription APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions` | Create prescription for connected patient |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions` | List prescriptions for a patient (doctor view) |
| `GET` | `/api/doctors/{doctor_id}/prescriptions` | List all prescriptions by this doctor |
| `GET` | `/api/patients/{patient_id}/prescriptions` | List prescriptions for patient (patient view) |
| `GET` | `/api/prescriptions/{prescription_id}` | Get prescription detail |

### Dev identity APIs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/doctors/for-dev` | Doctor list for dev identity picker |
| `GET` | `/api/config/features` | Extended feature flags (existing) |

---

## Frontend routes (Phase C)

### Doctor portal (`DoctorLayout`: sidebar, header, footer; `DevIdentityBanner` in dev)

| Route | Page | Description |
|-------|------|-------------|
| `/doctor` | Doctor Dashboard | Overview: connected patients, pending requests, recent activity |
| `/doctor/profile` | Doctor Profile | View/edit doctor's own profile |
| `/doctor/patients` | Patient List | List of connected patients with search/filter |
| `/doctor/patients/:patientId` | Patient Detail | View connected patient's profile, medical history, documents |
| `/doctor/patients/:patientId/chat` | AI Chat | Doctor–AI chat scoped to selected patient |
| `/doctor/patients/:patientId/prescriptions` | Prescriptions | Manage prescriptions for this patient |
| `/doctor/connections` | Connections | Manage pending/active connection requests |

### Patient portal (updated)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Patient Dashboard | (existing — unchanged) |
| `/profile` | Patient Profile | (existing — unchanged) |
| `/documents` | Patient Documents | (existing — unchanged) |
| `/connections` | My Doctors | Patient's connection management (send requests, view connected doctors) |
| `/prescriptions` | My Prescriptions | View prescriptions from connected doctors |

### Role selection (dev mode)

| Route | Page | Description |
|-------|------|-------------|
| `/dev/select-role` | Role Picker | Dev-only: choose patient or doctor identity |

---

## Cross-cutting concerns

- **Connection-based access:** Every doctor API that touches patient data validates an active connection exists between the requesting doctor and the target patient. This is enforced at the **service layer**, not just the API layer, so it cannot be bypassed.
- **Error handling:** All new APIs follow existing pattern (Pydantic validation → 422, not found → 404, forbidden → 403 for connection violations, server error → 500 with `detail`)
- **Casing:** `snake_case` in API JSON, `camelCase` in frontend state (existing convention)
- **Testing:** API tests with test fixtures for doctor and patient identities, connection test scenarios, no JWT required
- **Documentation:** Update `ARCHITECTURE.md`, `FRONTEND_BACKEND_COLLABORATION.md` as endpoints are added
- **AI integration:** Existing `search_patient_records` tool and chat infrastructure reused, with connection-gating added at the service layer

---

## Success criteria

1. A doctor profile can be created, viewed, and edited through the UI
2. A doctor or patient can send a connection request; the other party can accept or reject it
3. Only connected doctors can view a patient's profile, medical history, and documents
4. The doctor portal shows a patient list with only connected patients
5. Clicking a patient card opens a read-only view of their profile, dashboard, and documents
6. The doctor has a personal dashboard with connected patient count, pending requests, and recent activity
7. AI chat is scoped to doctors only, tied to a specific connected patient
8. Doctors can create prescriptions for connected patients; patients can view their prescriptions
9. All features work with the extended dev identity picker (no login required)
10. Backend APIs enforce connection-based access at the service layer, returning 403 for unauthorized access
11. Backend APIs are designed for future `user_id` injection from JWT (Phase E ready)

---

*Created: 2026-04-12 — Phase C doctor experience master plan*
