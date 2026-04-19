# Frontend — CLAUDE.md

React + Vite + Tailwind chat UI for the medical AI chat. Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Folder map

```
frontend/src/
├── App.tsx                  # PatientProvider + RouterProvider
├── router.tsx               # createBrowserRouter (portal + /public/chat + legacy redirects)
├── main.tsx                 # Redux Provider + React DOM mount
├── index.css                # Tailwind + patient shell sidebar (tablet rail) utilities
├── store/
│   ├── index.ts             # configureStore, baseApi middleware, setupListeners
│   └── hooks.ts             # useAppDispatch, useAppSelector
├── layouts/
│   └── PatientLayout.tsx    # DevIdentityBanner (dev) + Sidebar + Header + Outlet + Footer
├── api/
│   ├── index.ts             # Barrel: re-exports baseApi, *Api slices/hooks, client, legacy helpers
│   ├── baseApi.ts           # createApi + fetchBaseQuery wrapper (identity headers, skipPatientHeader)
│   ├── client.ts            # apiFetch / apiRequest, applyPrescribeHeaders, register* getters
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
│   ├── PatientContext.tsx   # Active patient + localStorage; RTK listPatients / getPatientsForChat
│   ├── IdentityContext.tsx  # Doctor dev identity; registerDoctorIdGetter
│   └── FeatureFlagContext.tsx # useGetFeatureFlagsQuery (or thin wrapper)
├── pages/
│   ├── DashboardPage.tsx    # Medical history (under PatientLayout)
│   ├── DocumentsPage.tsx    # Documents (under PatientLayout)
│   └── ProfilePage.tsx      # Patient profile (route `/profile`)
├── components/
│   ├── ChatPage.tsx         # Public chat at `/public/chat` (DevIdentityBanner in dev; picker when prod)
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

**Dev identity headers** (`X-Patient-Id`, `X-Doctor-Id`) still come from module getters in `api/client.ts`, registered by `PatientContext` / `IdentityContext`. `prepareHeaders` behavior is centralized in `applyPrescribeHeaders`, used by the RTK `baseQuery` wrapper and by SSE / legacy `apiFetch` paths. Routes that encode `patient_id` in the path and must not send `X-Patient-Id` pass **`skipPatientHeader`** on the request (e.g. doctor chat, `GET /patients/for-chat`, feature flags).

**Local UI state** (chat messages, streaming tokens, upload progress) stays in hooks and components. **SSE streaming** and **multipart upload** stay outside the RTK cache; on success they may `dispatch(baseApi.util.invalidateTags(...))` so RTK-backed lists stay consistent.

```
PatientContext → registerPatientIdGetter → client.applyPrescribeHeaders / baseQuery
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
