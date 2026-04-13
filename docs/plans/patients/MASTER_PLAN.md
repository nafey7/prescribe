# Phase B — Patient Experience: Master Plan

Phase B delivers the **complete patient-facing experience** — everything a patient needs to manage their medical history, upload documents, and view their health records. It builds on the Phase A domain schema foundation and prepares the data layer for doctor-scoped access in Phase C.

**Reference:** [`PRODUCT.md`](../../PRODUCT.md) · [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)

**Identity note:** Everything under `docs/plans/patients/` implements **Phase B (patient-facing features) only**. **Authentication is not part of these documents** — no signup, login, JWT, sessions, password handling, or production-style route/API protection. That work is **Phase E**, sequenced **after** doctor and admin surfaces, per the [product build order](../PLAN_PRODUCT_BUILD_ORDER.md). Until then, use the [dev identity picker](./PLAN_DEV_IDENTITY_PICKER.md) (or another agreed dev-only principal) so features are testable without auth.

**Public chat route:** The **existing AI chat** stays on a **dedicated public frontend path** — recommended: **`/public/chat`**. It is **not** nested under the patient portal shell (dashboard, profile, documents) so the URL clearly stays **publicly reachable** in the same sense as today (no login). The same `ChatPage` component and chat APIs apply; Phase E can leave this route open or treat it differently from authenticated portal routes without reshaping the whole app. Details: [Patient UI shell](./PLAN_PATIENT_UI_SHELL.md).

---

## Business context

From the product vision, the patient role centers on **pillar 1: Medical history hub** — patients consolidate all health documents (prescriptions, lab results, imaging reports, clinical notes) in one place, creating a portable personal health record. Phase B also establishes the **patient side of pillar 2: Doctor–patient connections** (data models and UI hooks, with full connection flow deferred to Phase C).

Since authentication ships in Phase E, Phase B uses a **dev identity picker** to simulate the current patient. All APIs and UI are designed so that `user_id` / `patient_id` can be wired to a real JWT identity later without a rewrite.

---

## Feature inventory (all Phase B features)

| # | Feature | Scope | Detailed plan |
|---|---------|-------|---------------|
| 1 | Patient Registration & Profile Management | Backend APIs + frontend forms for **patient profile records** (demographics, contact info, allergies, conditions) in MongoDB — **not** signup/login; see plan for scope | [`PLAN_PATIENT_REGISTRATION_PROFILE.md`](./PLAN_PATIENT_REGISTRATION_PROFILE.md) |
| 2 | Medical History Dashboard | Patient-facing dashboard displaying health timeline — prescriptions, lab results, diagnoses, clinical notes — pulled from MongoDB and the existing Markdown files | [`PLAN_MEDICAL_HISTORY_DASHBOARD.md`](./PLAN_MEDICAL_HISTORY_DASHBOARD.md) |
| 3 | Document Upload & Storage | Upload, store, list, view, and delete medical documents (PDF, images). Backend storage via MongoDB GridFS, processing hooks for future AI context | [`PLAN_DOCUMENT_UPLOAD_STORAGE.md`](./PLAN_DOCUMENT_UPLOAD_STORAGE.md) |
| 4 | Patient UI Shell & Navigation | App-wide layout, routing (React Router), sidebar/header, role-aware navigation, responsive design. Patient portal pages under a shared shell; **chat remains on a separate public route** (e.g. `/public/chat`) | [`PLAN_PATIENT_UI_SHELL.md`](./PLAN_PATIENT_UI_SHELL.md) |
| 5 | Dev Identity Picker | Development-only mechanism to simulate "current patient" without auth. Header component + context provider that sets `patient_id` for all API calls, replaceable by JWT in Phase E | [`PLAN_DEV_IDENTITY_PICKER.md`](./PLAN_DEV_IDENTITY_PICKER.md) |
| 6 | AI Document Suggestions | AI-powered extraction from uploaded documents that proposes profile updates (conditions, allergies, medications, lab results) for patient accept/reject. Feature-flagged via `AI_SUGGESTIONS_ENABLED` (default `true` for dev, flipped to `false` for production). Human-in-the-loop: nothing auto-commits | [`PLAN_AI_DOCUMENT_SUGGESTIONS.md`](./PLAN_AI_DOCUMENT_SUGGESTIONS.md) |

---

## Phase B scope boundaries

### In scope

- Patient CRUD (create, read, update profile) backed by MongoDB `users` collection
- Medical history display (structured records from DB + existing Markdown patient files)
- Document upload/download/delete via GridFS with metadata in a `documents` collection
- Supported document types: PDF, JPEG, PNG (extensible to DICOM/other formats later)
- Multi-page frontend with React Router: patient portal (`/`, `/profile`, `/documents`) plus **public** AI chat at **`/public/chat`** (see UI shell plan)
- Dev-mode patient picker (no auth required)
- Backend API design that accepts **path `patient_id` segments** resolved to a profile by **`user_id` (UUID) or `patient_slug`** (Markdown stem, e.g. `john_doe`), swappable to JWT-derived identity in Phase E — see [`FRONTEND_BACKEND_COLLABORATION.md`](../../FRONTEND_BACKEND_COLLABORATION.md)
- AI context source migration: `search_patient_records` tool updated to pull from both Markdown files and DB-stored documents (tracked work; may land after core Phase B APIs)

### Out of scope (deferred)

- Doctor–patient connection flow (Phase C)
- Prescription creation (Phase C — doctor capability)
- Authentication, JWT, route protection (Phase E)
- Real-time notifications
- FHIR/HL7 integration
- Vector search / RAG pipeline
- Cloud storage (S3, GCS) — GridFS is sufficient for prototype

---

## Dependency graph

```
Feature 5: Dev Identity Picker
    ↓ (provides simulated patient_id to all features)
Feature 1: Patient Registration & Profile
    ↓ (patient records must exist before dashboard can display them)
Feature 4: Patient UI Shell & Navigation
    ↓ (routing and layout needed for all pages)
Feature 2: Medical History Dashboard
    ↓ (dashboard provides the context for document viewing)
Feature 3: Document Upload & Storage
    ↓ (uploaded documents are the input for AI extraction)
Feature 6: AI Document Suggestions
```

**Recommended build order:** 5 → 1 → 4 → 2 → 3 → 6

Features 4 and 1 can partially overlap since the UI shell is independent of profile API logic. Feature 3 (uploads) depends on the dashboard existing to display documents within. Feature 6 (AI suggestions) depends on both document upload infrastructure (Feature 3) and the patient profile schema (Feature 1) since accepted suggestions write to profile fields.

---

## MongoDB collections touched

| Collection | Status | Phase B changes |
|------------|--------|-----------------|
| `users` | **New** | Patient profile documents (`role: "patient"`, demographics, allergies, conditions, contact info) |
| `documents` | **New** | Document metadata (patient_id, filename, content_type, gridfs_file_id, upload timestamp, category) |
| `fs.files` / `fs.chunks` | **New** (GridFS) | Actual file binary storage |
| `suggestions` | **New** | AI-extracted profile update proposals (patient_id, document_id, category, status, extracted_data) |
| `chat_sessions` | Existing | No structural changes; will reference `patient_id` from `users` |
| `chat_messages` | Existing | No structural changes |

---

## API surface (Phase B additions)

Path segment `{patient_id}` means **either** the profile’s `user_id` **(UUID)** **or** `patient_slug` (e.g. `john_doe`) where the backend resolves the same `users` document — same rules as [`FRONTEND_BACKEND_COLLABORATION.md`](../../FRONTEND_BACKEND_COLLABORATION.md).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/patients` | Register new patient |
| `GET` | `/api/patients` | Paginated profile list — query `skip`, `limit`; response `PatientListResponse` |
| `GET` | `/api/patients/for-chat` | Chat-oriented list: `PatientInfo[]` (Markdown / DB-backed slugs) for the dev identity picker |
| `GET` | `/api/chat/patients` | Legacy alias; same payload as `/api/patients/for-chat` |
| `GET` | `/api/patients/{patient_id}` | Get patient profile |
| `PUT` | `/api/patients/{patient_id}` | Update patient profile |
| `POST` | `/api/patients/{patient_id}/documents` | Upload document |
| `GET` | `/api/patients/{patient_id}/documents` | List patient documents (paginated; optional `category`) |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}` | Download/view document |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}/metadata` | JSON metadata only |
| `PUT` | `/api/patients/{patient_id}/documents/{document_id}` | Update document metadata (category, description, tags) |
| `DELETE` | `/api/patients/{patient_id}/documents/{document_id}` | Delete document |
| `GET` | `/api/patients/{patient_id}/medical-history` | Aggregated medical history (DB + Markdown) |
| `GET` | `/api/patients/{patient_id}/suggestions` | List AI-extracted suggestions (filter by `status`, `document_id`, `category`) |
| `PUT` | `/api/patients/{patient_id}/suggestions/{suggestion_id}/accept` | Accept a suggestion (applies to profile for conditions/allergies) |
| `PUT` | `/api/patients/{patient_id}/suggestions/{suggestion_id}/reject` | Reject a suggestion |
| `POST` | `/api/patients/{patient_id}/suggestions/accept-all` | Batch accept pending suggestions |
| `POST` | `/api/patients/{patient_id}/suggestions/reject-all` | Batch reject pending suggestions |
| `GET` | `/api/config/features` | Feature flags (currently: `ai_suggestions_enabled`) |

**Chat:** `POST /api/chat/message` and `POST /api/chat/message/stream` take JSON `ChatRequest` **`message` / optional `chat_id` only**. Active patient is **not** in the body — clients send header **`X-Patient-Id`** (required; 400 if missing). This matches the dev identity picker and Phase E header-shaped identity.

---

## Frontend routes (Phase B)

Canonical detail: [`FRONTEND_BACKEND_COLLABORATION.md`](../../FRONTEND_BACKEND_COLLABORATION.md) (deep links, QA).

**Patient portal** (shared `PatientLayout`: sidebar, header, footer; **`DevIdentityBanner`** in dev — see [UI shell](./PLAN_PATIENT_UI_SHELL.md)):

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Medical history overview, recent documents, quick stats |
| `/profile` | Patient Profile | View/edit demographics, allergies, conditions |
| `/documents` | Documents | Upload, browse, preview medical documents |
| `/dashboard` | — | Redirects to `/` |
| `/profile/:userId` | — | Legacy bookmark: sync picker to `userId`, redirect to `/profile` |

**Public chat** (outside the portal layout — URL reserved for “always reachable without portal auth” when Phase E lands):

| Route | Page | Description |
|-------|------|-------------|
| `/public/chat` | AI Chat | Same `ChatPage`; **not** under `PatientLayout`. In **dev**, `DevIdentityBanner` is rendered **on this route** (inside `ChatPage`), since the portal shell is not mounted here. |

Root `/` is the dashboard home for Phase B (not a redirect to chat).

---

## Cross-cutting concerns

- **Error handling:** All new APIs follow existing pattern (Pydantic validation → 422, not found → 404, server error → 500 with `detail`)
- **Casing:** `snake_case` in API JSON, `camelCase` in frontend state (existing convention)
- **Testing:** API tests with test fixtures for patient identities, no JWT required (use dev picker context)
- **Documentation:** Update `ARCHITECTURE.md`, `FRONTEND_BACKEND_COLLABORATION.md` as endpoints are added
- **AI integration:** `search_patient_records` tool extended to query DB-stored documents alongside Markdown files

---

## Success criteria

1. A patient can be created, viewed, and edited through the UI
2. Medical history is displayed in a structured, readable dashboard
3. Documents (PDF, images) can be uploaded, listed, viewed, and deleted
4. The app navigates between dashboard, profile, and documents within the portal, and the AI chat remains usable at **`/public/chat`** (public route)
5. All features work with the dev identity picker (no login required)
6. Chat at **`/public/chat`** works with **`X-Patient-Id`** (and the same streaming / history behavior as before aside from the moved patient context)
7. Backend APIs are designed for future `user_id` injection from JWT (Phase E ready)

---

*Created: 2026-04-12 — Phase B patient experience master plan*
