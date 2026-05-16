# Frontend — CLAUDE.md

React + Vite + MUI chat UI for the medical AI chat. Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Folder map

```
frontend/src/
├── theme/                   # `createAppTheme(mode)`, `paletteLight` / `paletteDark`, component overrides
├── providers/
│   └── AppThemeProvider.tsx # `useColorMode` + dynamic `ThemeProvider` + CssBaseline + GlobalStyles (tablet sidebar rail)
├── ui/                      # Reusable primitives (e.g. Markdown, `PortalSidebarBrandRow`)
├── App.tsx                  # FeatureFlagProvider + RouterProvider
├── router/
│   ├── paths.ts             # Single source of truth for SPA paths (`/patient/*`, `/doctor/*`)
│   ├── postAuthPath.ts      # `defaultPostAuthPath`, `safeReturnUrl` (post-login, open-redirect safe)
│   ├── authLanding.ts       # `isPublicAuthSurfacePath`, `authInterruptNavigateTo` (refresh → `/?returnUrl=`)
│   └── rolePortalRedirect.ts # Role vs URL namespace guard (used by ProtectedAppShell)
├── router.tsx               # createBrowserRouter + `appRouteTree` (memory-router tests, redirects)
├── main.tsx                 # Redux → `ColorModeProvider` → `AppThemeProvider` → App
├── index.css                # Minimal global CSS (reduced-motion); theme handles the rest
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
│   ├── ColorModeContext.tsx # Light/dark `PaletteMode`, `localStorage` (`prescribe-color-mode`), document `color-scheme`
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
│   ├── Sidebar.tsx (brand row + `ThemeToggleButton`), Header.tsx (route title + actions; no theme toggle), Footer.tsx, ThemeToggleButton.tsx, DevIdentityBanner.tsx
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
- **Markdown rendering:** `ChatMessage` uses `react-markdown` + `remark-gfm` via `ui/Markdown.tsx` (theme-aware typography).
- **Tests:** `npm run test` / `npm run test:run` (Vitest + jsdom). API tests live next to modules (e.g. `api/client.test.ts`, `api/baseApi.test.ts`).

## Testing — E2E (Playwright)

Cross-page journeys (login, role routing, sidebar navigation) live in the top-level [`e2e/`](../e2e/) workspace. Operational details — quick start, fixtures, env vars — are in [`docs/TESTING.md`](../docs/TESTING.md) (E2E section).

**Selector hygiene (enforced in review):**

1. `getByRole` first.
2. `getByLabel` when role is ambiguous.
3. `getByText` for assertions on copy.
4. `getByTestId` only when nothing above is stable.

Class names and XPath are not allowed. New `data-testid` attributes ship in the **same PR** as the spec that consumes them; today the only ones in the patient surface are `login-email`, `login-password`, `login-submit`, `login-error`, and the patient sidebar nav links (`nav-dashboard`, `nav-profile`, `nav-documents`, `nav-doctors`, `nav-meal-plans`, `nav-fitness-plans`). Do not sprinkle more without a spec reaching for them.

## Dependencies

- **Versioning:** Treat **`package-lock.json`** as the source of truth; commit it whenever `package.json` changes.
- **Docker:** After lockfile changes, sync the container with **`docker compose exec frontend npm ci`** (preferred for reproducibility) or `npm install`. See root [`CLAUDE.md`](../CLAUDE.md) — *Dependency changes in Docker*.

## Styling

- **MUI** (`@mui/material`) + **Emotion** (`sx`, `styled`, `theme.components` overrides)
- **Color mode:** `ColorModeProvider` (outer) + **`AppThemeProvider`** in `main.tsx`. Preference key: `prescribe-color-mode` (`light` \| `dark`); **default is `dark`** when unset (patient and doctor portals). Use **`theme.palette.surface.*`** (subtle / muted / elevated) instead of fixed `grey.50` / `grey.100` for fills. **`ThemeToggleButton`:** patient portal — sidebar brand row only (same as doctor); patient `Header` has route title + account actions only; landing/other surfaces keep their own toggle where applicable.
- Central **`theme/`** (`paletteLight` / `paletteDark`, `createAppTheme`, typography, shape, overrides); **`augmentation.d.ts`** extends `Palette` with `surface` and primary ramp keys.
- **`ui/`** for shared compositions (e.g. `Markdown.tsx`); feature UI stays under `components/` and `pages/`
- **`lucide-react`** for icons (not `@mui/icons-material` unless we adopt it later)

## Theme-first component styling (agents: read this before writing sx props)

Component defaults and shared styles live in **`theme/components/`** — one file per MUI component, all registered in `theme/components/index.ts`. Before setting a prop or `sx` style inline, check whether it is already covered by a theme default:

| Component | Defaults already set in theme |
|-----------|-------------------------------|
| `Button` | `disableElevation`, `textTransform: none`, `borderRadius` from shape |
| `TextField` | `size: small`, `variant: outlined` |
| `FormControl` | `size: small` |
| `Chip` | `size: small`, `variant: outlined` |
| `Paper` | `variant: outlined`, `borderRadius` from shape |
| `Card` | `variant: outlined` |
| `ToggleButton` | `textTransform: none` |
| `Dialog` | `scroll: paper`, `borderRadius`, `maxHeight: 90vh` |
| `LinearProgress` | `height: 8`, `borderRadius` pill |

**Rules:**
- **Never repeat a default in component code.** If `TextField` defaults to `size="small"`, do not write `size="small"` at each usage — it adds noise and breaks the contract (changing the default would require hunting all call sites).
- **One place to change = one file in `theme/components/`.** If a style should apply globally to a component type, add it there, not via `sx` at every usage.
- **Use `theme.palette.surface.*`** (`subtle` / `muted` / `elevated`) for background fills instead of hardcoded `grey[50]` / `grey[100]` — those don't adapt to dark mode.
- **Adding a new MUI component?** Create `theme/components/MuiXxx.ts`, define `defaultProps` and/or `styleOverrides`, then register it in `theme/components/index.ts`. Do not start by writing repeated `sx` props across screens.
- **`sx` is for layout and context-specific overrides only** (e.g. `mt`, `mb`, `width`, responsive show/hide). Visual identity (colors, radius, size, typography weight) belongs in the theme.

## Deep docs

- [API contract and streaming protocol](../docs/FRONTEND_BACKEND_COLLABORATION.md)
- [Testing strategy](../docs/TESTING.md)
- [Code quality conventions](../docs/CODE_QUALITY.md)
- [Redux / RTK Query plan](../docs/plans/PLAN_redux-rtk-query.md)
