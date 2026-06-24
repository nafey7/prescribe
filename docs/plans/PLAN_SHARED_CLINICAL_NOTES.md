# Shared clinical notes

## Goal

Give connected doctors a safe workflow to draft and publish encounter notes or after-visit summaries, and give patients a clear place to read those notes and request factual corrections. AI may help prepare a brief, but the clinician remains the author: generated text is always editable and requires an explicit publish action.

## Product decisions

- A **clinical note** is a durable, patient-visible record after publication. This first version does not persist private drafts; the create dialog owns draft state until the doctor publishes.
- Note types are `encounter_note` and `after_visit_summary`. Both have a title, encounter date, and Markdown content.
- AI generation accepts clinician-entered encounter context and the patient's current profile. It returns a structured title/content suggestion, never writes to MongoDB, and its prompt prohibits inventing diagnoses, findings, or instructions.
- Published notes can be revised by their author. `updated_at` exposes that a change occurred; the original author and publication time are retained.
- Correction requests are separate audit records rather than a mutable flag on the note. A patient may have one open request per note. The author can resolve it with a response after reviewing or revising the note.
- Connected doctors can create and manage only their own notes for a patient. Patients can read notes published to any of their canonical ID aliases.
- Notes are plain text/Markdown in this phase. Attachments, signatures, encounter scheduling, push/email notifications, deletion, and version-history snapshots are deferred.

## Data model

### `clinical_notes`

| Field | Type | Purpose |
|---|---|---|
| `note_id` | UUID string | Public stable identifier |
| `patient_id` | string | Canonical patient `user_id` |
| `doctor_id` | string | Publishing author |
| `note_type` | enum string | `encounter_note` or `after_visit_summary` |
| `title` | string | Patient-facing title |
| `content` | string | Reviewed Markdown body |
| `encounter_date` | `YYYY-MM-DD` | Date of encounter |
| `published_at` | UTC datetime | First publication time |
| `updated_at` | UTC datetime | Latest clinician revision |

Indexes: unique `note_id`; patient/date list; doctor/patient/date list.

### `clinical_note_corrections`

| Field | Type | Purpose |
|---|---|---|
| `correction_id` | UUID string | Public stable identifier |
| `note_id` | string | Target note |
| `patient_id` | string | Requesting patient |
| `doctor_id` | string | Note author / resolver scope |
| `comment` | string | Patient's requested correction |
| `status` | enum string | `open` or `resolved` |
| `created_at` | UTC datetime | Request time |
| `resolved_at` | UTC datetime or null | Resolution time |
| `resolution_note` | string or null | Clinician response |

Indexes: unique `correction_id`; note/time list; doctor/open list; partial unique `(note_id, patient_id)` where `status=open`.

## API contract

Doctor routes are connection-gated and require the path `doctor_id` to match the authenticated doctor:

- `GET /api/doctors/{doctor_id}/patients/{patient_id}/clinical-notes`
- `POST /api/doctors/{doctor_id}/patients/{patient_id}/clinical-notes/generate`
- `POST /api/doctors/{doctor_id}/patients/{patient_id}/clinical-notes`
- `PATCH /api/doctors/{doctor_id}/patients/{patient_id}/clinical-notes/{note_id}`
- `POST /api/doctors/{doctor_id}/patients/{patient_id}/clinical-notes/{note_id}/correction-requests/{correction_id}/resolve`

Patient routes require self-access to the patient path:

- `GET /api/patients/{patient_id}/clinical-notes`
- `GET /api/patients/{patient_id}/clinical-notes/{note_id}`
- `POST /api/patients/{patient_id}/clinical-notes/{note_id}/correction-requests`

Wire fields stay snake_case. List responses are paginated. Note responses include the latest correction request for the current note when one exists, allowing both portals to render open/resolved state without extra request waterfalls.

## Backend design

1. Pydantic schemas constrain note type, dates, title/content lengths, generation context, correction text, and resolution text.
2. Repository modules own indexes and Mongo queries. All patient reads accept patient ID aliases, matching existing share APIs.
3. The service canonicalizes patient IDs before writes, verifies doctor-patient connection for doctor routes, scopes mutations to the note author, and returns generic 404s for cross-patient note IDs.
4. AI generation builds bounded context from the existing medical-history aggregation and invokes the configured deterministic structured-output LLM off the event loop. Failures surface as 503; no fallback fabricates clinical prose.
5. The route layer applies existing JWT/dev-bypass dependencies and contains no business logic beyond response/status mapping.

## Frontend design

- Doctor patient detail: add a header action and a clinical-notes panel. The dialog supports type/date/context, “Generate brief,” editable title/content, and explicit publish. Existing notes show correction state; open requests can be resolved, and the note can be revised before resolving.
- Patient portal: add `Clinical notes` sidebar navigation, list page, and detail page. Markdown is rendered with the shared safe renderer. A patient can submit one correction request and see its status and clinician response.
- RTK Query owns list/detail/generate/publish/update/correction mutations and cache invalidation. API field names mirror snake_case.
- Empty, loading, error, generation, publishing, duplicate-request, and resolution states have explicit UI feedback.

## Security and safety

- Authentication is enforced by the existing route audit. Doctor IDs come from JWT/path matching; patient IDs are canonicalized after authorization.
- Active connection is required to generate, list, publish, revise, or resolve as a doctor.
- Patient note reads and correction creation use the same self-access and alias rules as existing shared plans.
- The LLM receives only the selected patient's bounded medical-history context and clinician input. The system prompt treats them as data, forbids invention, and labels the output as a draft requiring clinical review.
- No endpoint deletes or unpublishes a note in this phase, avoiding silent removal from the patient record.

## Test plan

- Schema tests: enum and size/date validation.
- Repository/service tests: canonical patient write, author/patient scoping, ordering, duplicate open correction behavior, revision timestamps, and correction resolution.
- API tests: doctor connection gate, generate/publish/list/update/resolve, patient self list/detail/flag, cross-patient denial, and route-audit coverage.
- AI tests: structured-output prompt invocation, context content, and provider failure mapping without a live model.
- Frontend tests: doctor creation dialog generation/publish behavior; patient correction form and existing-status behavior; route/path coverage.
- Verification: targeted tests first, then full backend pytest in Docker, frontend Vitest, ESLint, TypeScript/Vite build, and a live-stack smoke if services are available.

## Delivery order and rollback

1. Schemas, repositories, indexes.
2. Service and AI draft generation.
3. Protected APIs and backend tests.
4. Doctor UI and tests.
5. Patient routes/UI and tests.
6. Contract, architecture, and testing docs; full verification.

Rollback is additive: remove the new routes/UI/index startup calls while retaining the two collections for data preservation. No existing collection is migrated or destructively changed.
