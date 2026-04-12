# Product build order — from prototype to multi-role app

## Summary

This document captures **how to sequence work** when evolving Prescribe v2 from the current medical AI chat prototype into a product with patients, doctors, admins, and authentication.

**Current strategy:** Implement **full patient-facing capabilities** (frontend and backend), then **full doctor-facing capabilities**, then **full admin capabilities**. **Authentication, JWT, and route/API protection come last**, once those role-specific surfaces are built and stable. Data models from Phase A give each feature a place to attach data without waiting on auth.

**Reference baseline:** [PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md](../PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md) (original prototype scope: no auth, file-based patient context). Current code already implements chat, LangGraph, MongoDB sessions/messages, and streaming ([STREAMING_PLAN.md](../STREAMING_PLAN.md)).

---

## Where the codebase is today

- **Backend:** FastAPI in [backend/app/main.py](../../backend/app/main.py), chat API in [backend/app/api/chat.py](../../backend/app/api/chat.py), orchestration in [backend/app/service/chat.py](../../backend/app/service/chat.py), persistence in [backend/app/repository/chat.py](../../backend/app/repository/chat.py) (`chat_sessions`, `chat_messages`), AI in [backend/app/ai/](../../backend/app/ai/).
- **Frontend:** React + Vite chat UI under [frontend/src/](../../frontend/src/).
- **Patient context today:** `patient_id` strings tied to files under [data/patients/](../../data/patients/), not database-backed patient records or user accounts (evolving per phase plans).

---

## Sequencing rationale

| Question | Approach |
|----------|----------|
| When do we add signup, login, JWT, and protected routes? | **After** patient, doctor, and admin features are implemented end-to-end. Auth is the integration layer that locks down what already works. |
| Why not auth earlier? | You asked to ship **complete role experiences** first (including uploads, prescriptions, admin tools) without blocking on identity plumbing. During development, use **dev-only or implicit context** (e.g. selected patient/doctor IDs) with the understanding that **production-style isolation requires auth**. |
| What was Phase A for? | **MongoDB collections, Pydantic models, and relationships** so later phases do not retrofit `User` and foreign keys from scratch. **Phase A is done** — see [PLAN_PHASE_A_SCHEMA_DESIGN.md](./PLAN_PHASE_A_SCHEMA_DESIGN.md). |

---

## Recommended dependency order (role-first, auth last)

```mermaid
flowchart TD
  schemas[Phase A: Data models — DONE]
  patient[Patient: full FE + BE]
  doctor[Doctor: full FE + BE]
  admin[Admin: full FE + BE]
  auth[Auth + protect APIs and routes]

  schemas --> patient
  patient --> doctor
  doctor --> admin
  admin --> auth
```

1. **Phase A (complete)** — Collections, models, indexes, doctor–patient links, and related design decisions documented.
2. **Patient side** — Everything a patient needs: portal UX, AI chat tied to patient context, **document upload and storage**, **supported document types**, retrieval for the model, and any patient-only settings. Backend APIs and frontend flows **without** requiring login in the final sense (use agreed dev scoping until auth lands).
3. **Doctor side** — Everything a clinician needs: dashboard, patient lists, **prescriptions only for linked/assigned patients**, chat or review flows scoped to those patients, and doctor-specific UI. Enforce **linkage rules in the backend** even before JWT (e.g. doctor id + patient id checks).
4. **Admin side** — Full admin surface: user/org/patient/doctor management (per product scope), moderation, configuration, or audit views as defined in your admin spec. Backend + frontend.
5. **Auth and protection** — `POST /auth/signup`, `POST /auth/login`, JWT (or sessions), `Depends(get_current_user)`, **protect existing APIs**, attach sessions to real `user_id`, frontend token/cookie handling, and **route guards** once all role flows exist.

---

## Phase outline (high level)

### Phase A — Domain schema design — **completed**

- **Goal:** MongoDB collections and Pydantic models for `User` (or `Account`), `Patient` profile, `Doctor` profile, `Admin` or `role: admin`, and relationships (e.g. doctor–patient assignment).
- **Touch:** Modules under [backend/app/schemas/](../../backend/app/schemas/), [backend/app/repository/](../../backend/app/repository/), indexes via [init-mongo.js](../../init-mongo.js) or migration scripts.
- **Detailed plan:** [PLAN_PHASE_A_SCHEMA_DESIGN.md](./PLAN_PHASE_A_SCHEMA_DESIGN.md).

### Phase B — Patient: all features (frontend + backend)

- **Goal:** Complete patient experience — chat/context, **upload and storage of documents**, **supported types** (PDF, images, etc., per product rules), processing pipeline hooks for AI, and patient-facing UI. Persist against Phase A models.
- **Touch:** Patient APIs, storage layer (e.g. object storage or GridFS — as decided), [backend/app/ai/tools.py](../../backend/app/ai/tools.py) if context sources change; patient routes and components in the frontend.
- **Note:** Until auth (Phase E), define how you simulate “current patient” (dev picker, env, or single test account) so features are testable without login.

### Phase C — Doctor: all features (frontend + backend)

- **Goal:** Complete doctor experience — **write prescriptions only for linked/assigned patients**, patient selection, chat or clinical workflows scoped to allowed patients, and doctor UI.
- **Touch:** Authorization logic in services (doctor–patient link checks); doctor dashboards and APIs; tests for forbidden access between doctors’ patients.

### Phase D — Admin: all features (frontend + backend)

- **Goal:** Complete admin experience — management and configuration surfaces defined for your product (users, roles, assignments, system settings, etc.).
- **Touch:** Admin APIs, admin UI, and backend checks for admin-only operations.

### Phase E — Authentication and protection (after B–D)

- **Goal:** Signup/login (or invite-only, per policy), JWT issuance, password hashing, `GET /auth/me`, require credentials for protected routes; **wire chat and all role APIs to authenticated `user_id`**; frontend: storage of tokens, `Authorization` headers, route protection.
- **Touch:** New [backend/app/api/](../../backend/app/api/) auth router, [backend/app/config.py](../../backend/app/config.py) for secrets; [backend/app/api/chat.py](../../backend/app/api/chat.py), repositories, [frontend/src/api/chat.ts](../../frontend/src/api/chat.ts) and app routing.
- **Deferred until needed:** OAuth, SSO, password reset emails.

### Parallel / ongoing — Replace file-only patients (optional)

- **Goal:** Move from [data/patients/*.md](../../data/patients/) as the sole source to DB-backed records + attachments where not already covered in Phase B; keep RAG/tooling aligned with the chosen source of truth.
- **Touch:** [backend/app/ai/tools.py](../../backend/app/ai/tools.py), patient APIs.

---

## Design decisions to lock early

- **Single `users` collection with `role`** is usually simpler than three unrelated tables; store role-specific fields in nested objects or linked collections.
- **Identifiers:** Prefer stable `user_id` / `patient_id` UUIDs; keep `patient_id` in chat aligned with whatever the AI tool resolves (file slug vs DB id — pick one naming scheme).
- **Security:** JWT in memory or `httpOnly` cookies beats `localStorage` for XSS resilience; align frontend storage with your threat model **when implementing Phase E**.
- **Pre-auth development:** Treat unauthenticated stacks as **development-only** for sensitive data; do not deploy wide exposure without Phase E.
- **Compliance:** Real PHI, HIPAA, and audit trails are out of scope for the original prototype; if you approach production, treat security and legal review as a separate program of work.

---

## Testing expectations

- **Phases B–D:** API and integration tests for business rules (document types, prescription linkage, admin actions) using test fixtures for doctor/patient/admin identities **without** requiring full JWT if you use test doubles for “current principal.”
- **Phase E:** Unit tests for password verify, JWT encode/decode, role checks; API tests for 401 without token, 403 when role wrong, 200 when allowed; regression suites so existing chat and role flows still work with auth enabled.

---

## What not to do first

- **Do not** block patient document pipelines on full auth if the agreed plan is role features first — but **do** design storage and APIs so Phase E can attach `user_id` and tighten access without a rewrite.
- **Do not** duplicate “patient” as only markdown files and again in Mongo without a migration story — pick the source of truth for `patient_id` early (Phase A + patient phase work).

---

## Related documents

- [PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md](../PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md) — Original prototype phases (Docker, backend, AI, frontend, polish).
- [STREAMING_PLAN.md](../STREAMING_PLAN.md) — SSE streaming (already aligned with additive `/message/stream` pattern).

---

*Last updated: 2026-04-12 — role-first build order (patient → doctor → admin), auth last; Phase A marked complete.*
