# Feature 5: Dev Identity Picker

Provides a development-only mechanism to simulate "current patient" across the entire application **without implementing authentication**. This plan intentionally does **not** cover login, JWT, or route guards — those are Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md). This feature is the agreed stand-in until auth ships.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 1st (prerequisite for all other features)

---

## Problem

The current app has a `PatientSelector` dropdown inside the chat page that sets `patient_id` only for chat API calls. Phase B introduces multiple pages (dashboard, profile, documents) that all need to know the active patient. Without auth (Phase E), we need a global dev-mode identity system that:

1. Provides `patient_id` to every page and API call
2. Is clearly marked as dev-only (not production)
3. Can be replaced by JWT-derived identity in Phase E with minimal refactoring

---

## Design

### Backend

**No new backend endpoints.** The existing `GET /api/patients` (currently `GET /api/chat/patients`) provides the patient list. All new Phase B APIs accept `patient_id` as a path parameter — the frontend is responsible for supplying the correct one from the dev picker context.

**Header convention:** For future-proofing, the frontend will send `X-Patient-Id` as a request header on all API calls. This mirrors how `Authorization: Bearer <token>` would work in Phase E — the backend extracts identity from a header. During Phase B, the backend reads `X-Patient-Id` from the request; in Phase E, it reads from the JWT instead.

#### Backend changes

1. **New dependency function** `get_current_patient_id` in `backend/app/api/dependencies.py`:
   - Reads `X-Patient-Id` from request headers
   - Returns the patient ID string
   - Raises `400` if header is missing
   - In Phase E, this function is replaced with JWT extraction — single point of change

2. **Update existing chat endpoints** to use `get_current_patient_id` instead of reading `patient_id` from the request body. The `ChatRequest` schema drops its `patient_id` field; the patient context comes from the header/dependency.

3. **Move patient list endpoint** from `/api/chat/patients` to `/api/patients` (general-purpose, not chat-specific). Keep the old path as a redirect or alias during transition.

### Frontend

**Public chat URL:** Chat lives at **`/public/chat`** (see [Patient UI shell](./PLAN_PATIENT_UI_SHELL.md)) — outside the patient portal layout but still under the same **`PatientProvider`** / app root so `X-Patient-Id` and shared API clients apply. “Public” here means **no portal shell and no login**, not “no patient context for API calls.”

1. **`PatientContext`** — React context provider (`frontend/src/contexts/PatientContext.tsx`):
   - State: `currentPatientId`, `currentPatient` (full object), `patients` (list), `isLoading`
   - Fetches patient list on mount from `GET /api/patients`
   - Persists selected patient in `localStorage` for page refresh survival
   - Exposes `setCurrentPatientId(id)` to switch patients

2. **`DevIdentityBanner`** — Visible banner component (`frontend/src/components/DevIdentityBanner.tsx`):
   - Sticky bar at the top of the app (above main layout)
   - Shows: "DEV MODE — Acting as: [Patient Name ▾]" with a dropdown to switch
   - Distinct styling (yellow/amber background) so it's obviously dev-only
   - Conditionally rendered only when `import.meta.env.DEV` is true (stripped in production builds)

3. **API client update** — `frontend/src/api/client.ts` (new base client):
   - Wraps `fetch` and automatically injects `X-Patient-Id` header from `PatientContext`
   - All API modules (`chat.ts`, future `patients.ts`, `documents.ts`) use this client
   - Replaces the inline `request()` function in `api/chat.ts`

4. **Remove `PatientSelector` from `ChatPage`** — patient selection moves to the global `DevIdentityBanner`. The chat page reads `patient_id` from context.

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/api/dependencies.py` | `get_current_patient_id` dependency |
| `frontend/src/contexts/PatientContext.tsx` | Global patient identity context |
| `frontend/src/components/DevIdentityBanner.tsx` | Dev-mode patient switcher banner |
| `frontend/src/api/client.ts` | Shared API client with auto-injected headers |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/chat.py` | Use `get_current_patient_id` dependency; remove `patient_id` from body handling |
| `backend/app/api/router.py` | Mount patient list at `/patients` (in addition to or replacing `/chat/patients`) |
| `backend/app/schemas/chat.py` | `ChatRequest.patient_id` becomes optional/removed (sourced from header) |
| `frontend/src/api/chat.ts` | Use new `client.ts` base; stop passing `patient_id` in body |
| `frontend/src/App.tsx` | Wrap app in `PatientProvider`; render `DevIdentityBanner` |
| `frontend/src/components/ChatPage.tsx` | Remove inline patient selector; read from context |
| `frontend/src/hooks/useChat.ts` | Read `patientId` from `PatientContext` instead of local state |
| `frontend/src/components/PatientSelector.tsx` | Repurpose or remove (logic moves to `DevIdentityBanner`) |

---

## Implementation steps

### Step 1 — Backend dependency

```python
# backend/app/api/dependencies.py
from fastapi import Header, HTTPException

async def get_current_patient_id(
    x_patient_id: str | None = Header(None),
) -> str:
    if not x_patient_id:
        raise HTTPException(
            status_code=400,
            detail="X-Patient-Id header is required",
        )
    return x_patient_id
```

### Step 2 — Move patient list endpoint

Add a new router `backend/app/api/patients.py` with `GET /` (mounted at `/api/patients`). The handler calls the existing `list_patients()` service function. Keep `GET /api/chat/patients` working for backward compatibility during migration.

### Step 3 — Update chat endpoints

Inject `patient_id: str = Depends(get_current_patient_id)` into chat route handlers. Remove `patient_id` from `ChatRequest` body. Pass the header-derived `patient_id` to service functions.

### Step 4 — Frontend context provider

Create `PatientContext` with `usePatientContext()` hook. Wrap `<App>` in `<PatientProvider>`. Fetch patients on mount, default to first patient or `localStorage` saved selection.

### Step 5 — Shared API client

Create `api/client.ts` that reads from `PatientContext` (or a module-level getter) and injects `X-Patient-Id` on every request. Migrate `api/chat.ts` to use it.

### Step 6 — Dev identity banner

Build `DevIdentityBanner` component. Patient dropdown triggers `setCurrentPatientId`. Render conditionally on `import.meta.env.DEV`.

### Step 7 — Clean up chat page

Remove `PatientSelector` from `ChatPage`. Update `useChat` to source `patientId` from context. Verify chat still works end-to-end with the new header-based identity.

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Chat endpoint without `X-Patient-Id` header | API | Returns 400 |
| Chat endpoint with valid `X-Patient-Id` header | API | Returns 200, correct patient scoping |
| `GET /api/patients` returns patient list | API | Backward compatibility |
| Patient context provides ID to child components | Frontend unit | Context wiring |
| Switching patient in banner updates all API calls | Frontend integration | End-to-end identity propagation |
| localStorage persistence survives page refresh | Frontend | State survival |

---

## Phase E migration path

When auth ships:
1. Replace `get_current_patient_id` body with JWT token extraction + user lookup
2. Remove `DevIdentityBanner` component (or gate behind a `DEV_MODE` flag)
3. Remove `X-Patient-Id` header injection from `api/client.ts`
4. `PatientContext` sources identity from the auth session instead of a picker

Single point of change on backend (`dependencies.py`), single point on frontend (`PatientContext` provider source).

---

*Created: 2026-04-12*
