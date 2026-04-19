# Frontend — CLAUDE.md

React + Vite + Tailwind chat UI for the medical AI chat. Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Folder map

```
frontend/src/
├── App.tsx                  # FeatureFlagProvider + RouterProvider
├── router/
│   ├── paths.ts             # Single source of truth for SPA paths (`/patient/*`, `/doctor/*`)
│   ├── postAuthPath.ts      # `defaultPostAuthPath`, `safeReturnUrl` (post-login, open-redirect safe)
│   ├── authLanding.ts       # `isPublicAuthSurfacePath`, `authInterruptNavigateTo` (refresh → `/?returnUrl=`)
│   └── rolePortalRedirect.ts # Role vs URL namespace guard (used by ProtectedAppShell)
├── router.tsx               # createBrowserRouter + `appRouteTree` (memory-router tests, redirects)
├── main.tsx                 # Redux Provider + React DOM mount
├── index.css                # Tailwind + patient shell sidebar (tablet rail) utilities
├── store/
│   ├── index.ts             # configureStore, baseApi middleware, setupListeners
│   └── hooks.ts             # useAppDispatch, useAppSelector
├── layouts/
│   ├── RootLayout.tsx       # AuthProvider + Outlet
│   ├── ProtectedAppShell.tsx # RequireAuth + IdentityProvider + PatientProvider; `useLayoutEffect` role redirect
│   ├── PatientLayout.tsx    # Sidebar + Header + Outlet + Footer
│   └── DoctorLayout.tsx
├── api/
│   ├── index.ts             # Barrel: re-exports baseApi, *Api slices/hooks, client, legacy helpers
│   ├── env.ts               # getApiBase / API_BASE_URL (shared; avoids client ↔ authSession cycles)
│   ├── baseApi.ts           # createApi + fetchBaseQuery wrapper (headers, 401 → refresh → one retry)
│   ├── authSession.ts       # configureAuthSession, ensureFreshAccessToken (single-flight refresh)
│   ├── authApi.ts           # login, signup, refresh, logout, getMe (refresh/logout skip 401 handler)
│   ├── client.ts            # apiFetch / apiRequest, applyPrescribeHeaders, register* getters + Bearer
│   ├── config.ts            # FeatureFlags type (wire DTO)
│   ├── configApi.ts         # getFeatureFlags query
│   ├── patientsApi.ts       # Patients + medical history (RTK Query)
│   ├── doctorsApi.ts        # Doctor profile, dashboard, connected patient profile/history (RTK Query)
│   ├── connectionsApi.ts    # accept/reject connection mutations
│   ├── documentsApi.ts      # Document list/metadata mutations (RTK Query)
│   ├── documents.ts         # XHR upload, blob download, public URLs (non-RTK)
│   ├── doctors.ts           # Imperative helpers still on apiRequest (dev doctor list, blobs, …)
│   ├── chatApi.ts           # Chat REST (history, send message, doctor chat)
│   ├── chat.ts              # Re-exports streaming helpers
│   ├── chatStream.ts        # SSE streams (shared header rules via client)
│   └── suggestionsApi.ts    # Suggestions list + mutations
├── contexts/
│   ├── AuthContext.tsx      # Tokens (memory + sessionStorage), /me bootstrap, login/signup/logout, proactive refresh
│   ├── PatientContext.tsx   # Active patient + localStorage; sync from JWT when role=patient
│   ├── IdentityContext.tsx  # Dev picker when `auth_relaxed`; else role + doctor id from `useAuth().user`
│   └── FeatureFlagContext.tsx # Config snapshot + `auth_relaxed` from GET /api/config/features
├── pages/
│   ├── LoginPage.tsx        # `/login` → `/?auth=login` (+ query)
│   ├── SignupPage.tsx       # `/signup` → `/?auth=signup` (+ query)
│   ├── LandingPage.tsx      # `/` auth UI; patient/doctor signup tab when `allowDoctorSelfSignup`
│   ├── DashboardPage.tsx    # Patient dashboard (route `/patient`)
│   ├── DocumentsPage.tsx    # `/patient/documents`
│   ├── ProfilePage.tsx      # `/patient/profile`
│   └── patient/             # e.g. PatientDoctorsPage (`/patient/doctors`)
├── components/
│   ├── ChatPage.tsx         # Patient AI chat at `/patient/chat`
│   ├── Sidebar.tsx, Header.tsx, Footer.tsx, DevIdentityBanner.tsx
│   ├── DevIdentityBanner.tsx # Dev-only amber bar + PatientSelector (PatientLayout + ChatPage)
│   ├── MessageList.tsx
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── PatientSelector.tsx  # Dropdown (used by DevIdentityBanner)
│   ├── documents/           # UploadModal, DocumentCard, DocumentPreview, CategoryFilter, etc.
│   └── patient/             # Profile form sections (demographics, lists, lifestyle, etc.)
├── hooks/
│   ├── useChat.ts           # Streaming + RTK invalidation where needed
│   ├── useDocuments.ts      # RTK list + XHR upload refresh
│   └── …                    # Other feature hooks
└── types/
    ├── chat.ts
    ├── patient.ts           # Profile DTOs (snake_case)
    └── document.ts          # Document uploads (snake_case)
```

## State and data flow

**Server state (REST JSON)** is loaded and cached with **RTK Query**: one `baseApi` in `api/baseApi.ts`, domain endpoints injected from `api/*Api.ts`, store wired in `store/index.ts`. Lists and detail views use **tag-based invalidation** (`providesTags` / `invalidatesTags`) so mutations refresh related queries.

**Authentication (Phase D):** `AuthProvider` mirrors access/refresh tokens to `sessionStorage`, registers `registerAccessTokenGetter`, and calls `configureAuthSession` so `ensureFreshAccessToken` can run single-flight refresh. `applyPrescribeHeaders` adds **`Authorization: Bearer`** when a token is registered and **omits** `X-Patient-Id` / `X-Doctor-Id` (backend ignores those when JWT is present). The RTK `baseQuery` wrapper and `apiFetch` both **retry once** after **401** if refresh succeeds. `authApi` marks **`skipAuthRefresh: true`** on login, signup, refresh, and logout to avoid recursion. SSE helpers in `chatStream.ts` retry the initial `fetch` after the same refresh. **`RequireAuth`** reads **`auth_relaxed`** from `GET /api/config/features`; when false, unauthenticated users are sent to **`/?returnUrl=…`** (landing), not `/login`.

**URL convention:** Patient features live under **`/patient/*`**, doctor under **`/doctor/*`**. Import paths from **`router/paths.ts`**; **`npm run lint`** enforces no raw `/patient`/`/doctor`/legacy strings in components.

**Dev identity headers** (`X-Patient-Id`, `X-Doctor-Id`) apply only when no Bearer token is active and the backend reports `auth_relaxed: true`. Routes that encode `patient_id` in the path and must not send `X-Patient-Id` pass **`skipPatientHeader`** (e.g. doctor chat, `GET /patients/for-chat`, feature flags).

**Local UI state** (chat messages, streaming tokens, upload progress) stays in hooks and components. **SSE streaming** and **multipart upload** stay outside the RTK cache; on success they may `dispatch(baseApi.util.invalidateTags(...))` so RTK-backed lists stay consistent.

```
AuthContext → registerAccessTokenGetter → applyPrescribeHeaders (Bearer) / ensureFreshAccessToken
PatientContext → registerPatientIdGetter ────────────────────────┘
IdentityContext → registerDoctorIdGetter ────────────────────────┘
                      ↓
Pages / hooks → useXxxQuery / useXxxMutation (from *Api.ts or api barrel)
                      ↓
Redux store → baseApi middleware → fetch (JSON)
```

## Key patterns

- **RTK Query for REST:** Prefer generated hooks from `patientsApi`, `doctorsApi`, `chatApi`, etc., or import from `api/index.ts` when you want a single entry point.
- **Single hook for chat UX:** `useChat(patientId)` owns messages, chatId, loading, and error; it uses streaming helpers and may invalidate chat tags when a turn completes.
- **SSE streaming:** `sendMessageStream` / doctor variants in `chatStream.ts` use `fetch` + `ReadableStream`. No EventSource library.
- **RAF token buffering:** Tokens are batched in a `requestAnimationFrame` buffer to limit re-renders during fast streaming.
- **Markdown rendering:** `ChatMessage` uses `react-markdown` + `remark-gfm` + `@tailwindcss/typography`.
- **Tests:** `npm run test` / `npm run test:run` (Vitest + jsdom). API tests live next to modules (e.g. `api/client.test.ts`, `api/baseApi.test.ts`).

## Dependencies

- **Versioning:** Treat **`package-lock.json`** as the source of truth; commit it whenever `package.json` changes.
- **Docker:** After lockfile changes, sync the container with **`docker compose exec frontend npm ci`** (preferred for reproducibility) or `npm install`. See root [`CLAUDE.md`](../CLAUDE.md) — *Dependency changes in Docker*.

## Styling

- Tailwind CSS 3 with the typography plugin for markdown content
- No component library — custom components with Tailwind utility classes
- `lucide-react` for icons

## Deep docs

- [API contract and streaming protocol](../docs/FRONTEND_BACKEND_COLLABORATION.md)
- [Testing strategy](../docs/TESTING.md)
- [Code quality conventions](../docs/CODE_QUALITY.md)
- [Redux / RTK Query plan](../docs/plans/PLAN_redux-rtk-query.md)
