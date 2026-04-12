# Feature 4: Patient UI Shell & Navigation

Transforms the single-page chat app into a multi-page patient portal with routing, a persistent layout shell, sidebar navigation, and responsive design. This is the structural foundation that all frontend pages (dashboard, profile, documents, chat) mount into.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 3rd (after Dev Identity Picker and Patient Registration)

**Auth:** No login, signup, password reset, or token storage in this plan — authentication is Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md). The header “avatar” placeholder is cosmetic until Phase E.

**Public chat:** The **existing AI chat** remains on a **separate public frontend route** — **`/public/chat`** — **not** as a child of `PatientLayout`. That keeps the same “open prototype chat” URL semantics as today and gives Phase E a clear place to treat chat as public while other routes may require auth. The portal sidebar still links to this route.

---

## Problem

The current frontend is a single component tree: `App → ChatPage`. There is no routing, no navigation, no layout shell. Phase B introduces a **patient portal** with three shell-mounted pages (dashboard, profile, documents) **plus** the existing chat on **`/public/chat`**:

1. Client-side routing (React Router)
2. A shared layout with sidebar navigation for portal pages only
3. A header bar with patient context (from Dev Identity Picker) on portal routes
4. Responsive design that works on desktop and tablet
5. A structure that Phase C (doctor experience) can extend with role-based navigation
6. **Public chat route** — `ChatPage` at `/public/chat`, outside the portal shell

---

## Design

### Route structure

| Path | Page component | Layout | Description |
|------|---------------|--------|-------------|
| `/` | `DashboardPage` | `PatientLayout` | Medical history overview (Feature 2) |
| `/profile` | `ProfilePage` | `PatientLayout` | Patient profile view/edit (Feature 1) |
| `/documents` | `DocumentsPage` | `PatientLayout` | Document management (Feature 3) |
| `/public/chat` | `ChatPage` | **None (public)** | Existing AI chat — **public route**, not nested under the patient shell |

Do **not** mount chat at `/chat` under `PatientLayout` if the goal is a stable **public** URL namespace; use **`/public/chat`** as the canonical chat path for Phase B and beyond.

### Layout architecture

```
┌─────────────────────────────────────────────────┐
│  DevIdentityBanner (dev mode only, amber bar)   │
├────────┬────────────────────────────────────────┤
│        │  Header (patient name, breadcrumbs)    │
│  Side  ├────────────────────────────────────────┤
│  bar   │                                        │
│        │            Page Content                │
│  Nav   │          (router outlet)               │
│        │                                        │
│        │                                        │
├────────┴────────────────────────────────────────┤
│  Footer (disclaimer, educational notice)        │
└─────────────────────────────────────────────────┘
```

### Sidebar navigation

- **Dashboard** — Home icon + "Dashboard"
- **Profile** — User icon + "My Profile"
- **Documents** — File icon + "Documents"
- **AI Chat** — Message icon + "AI Chat" — navigates to **`/public/chat`** (opens outside portal shell; same as a normal `<a>` or `navigate` to full path)
- Active state: highlighted background, bold text
- Collapsible on smaller screens (hamburger menu)

### Header

- Left: Patient name and role badge ("Patient")
- Center: Page title / breadcrumb
- Right: placeholder for notifications (Phase C) and avatar (Phase E)

### Responsive behavior

| Breakpoint | Sidebar | Layout |
|------------|---------|--------|
| ≥1024px (desktop) | Always visible, 240px wide | Side-by-side |
| 768–1023px (tablet) | Collapsed to icons (64px), expand on hover | Compact |
| <768px (mobile) | Hidden, hamburger toggle overlay | Full-width content |

---

## Implementation

### Dependencies

Add `react-router-dom` to frontend:

```bash
cd frontend && npm install react-router-dom
```

### New files

| File | Purpose |
|------|---------|
| `frontend/src/layouts/PatientLayout.tsx` | Shared shell: sidebar + header + outlet |
| `frontend/src/components/Sidebar.tsx` | Navigation sidebar with links and icons |
| `frontend/src/components/Header.tsx` | Top header bar with patient context |
| `frontend/src/components/Footer.tsx` | Bottom disclaimer bar |
| `frontend/src/pages/DashboardPage.tsx` | Placeholder (built out in Feature 2) |
| `frontend/src/pages/ProfilePage.tsx` | Already planned in Feature 1 |
| `frontend/src/pages/DocumentsPage.tsx` | Placeholder (built out in Feature 3) |
| `frontend/src/router.tsx` | Route definitions with `createBrowserRouter` |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Replace direct `<ChatPage>` with `<RouterProvider>` wrapped in `<PatientProvider>` |
| `frontend/src/components/ChatPage.tsx` | Remove standalone layout concerns (disclaimer header, patient selector); becomes a pure chat content component within the layout |
| `frontend/src/index.css` | Add layout utility classes, sidebar transitions |
| `frontend/vite.config.ts` | Possibly add SPA fallback for dev server if not already configured |

---

### Router setup (`frontend/src/router.tsx`)

Top-level routes: **`/public/chat`** is a sibling of the portal layout, not a child — so chat is never wrapped by `PatientLayout` and stays a **public** path by structure. `PatientProvider` still wraps `<RouterProvider>` in `App.tsx` so `ChatPage` can read `PatientContext` and send `X-Patient-Id` (see [Dev Identity Picker](./PLAN_DEV_IDENTITY_PICKER.md)).

```tsx
import { createBrowserRouter } from "react-router-dom";
import PatientLayout from "./layouts/PatientLayout";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage from "./components/ChatPage";

export const router = createBrowserRouter([
  { path: "/public/chat", element: <ChatPage /> },
  {
    element: <PatientLayout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/documents", element: <DocumentsPage /> },
    ],
  },
]);
```

Optional: redirect legacy `/` chat-only bookmarks from `/` to `/public/chat` during transition, or make `/` the dashboard only (per product choice).

### Layout component (`frontend/src/layouts/PatientLayout.tsx`)

```tsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DevIdentityBanner from "../components/DevIdentityBanner";

export default function PatientLayout() {
  return (
    <div className="flex flex-col h-screen">
      {import.meta.env.DEV && <DevIdentityBanner />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
```

### Updated App.tsx

```tsx
import { RouterProvider } from "react-router-dom";
import { PatientProvider } from "./contexts/PatientContext";
import { router } from "./router";

export default function App() {
  return (
    <PatientProvider>
      <RouterProvider router={router} />
    </PatientProvider>
  );
}
```

---

## Sidebar component design

Navigation items are data-driven for easy extension in Phase C (add doctor nav items):

```tsx
const patientNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/profile", label: "My Profile", icon: User },
  { path: "/documents", label: "Documents", icon: FileText },
  { path: "/public/chat", label: "AI Chat", icon: MessageSquare, publicRoute: true },
];
```

Active state detection via `useLocation()`: for **`/public/chat`**, treat `pathname === "/public/chat"` as active when the user is on the public chat page (portal routes use prefix or exact match as usual). Icons use inline SVGs or a lightweight icon library (Lucide React is already Tailwind-friendly and tree-shakable).

---

## ChatPage migration (`/public/chat`)

The existing `ChatPage` currently handles:
- Disclaimer banner → on **`/public/chat`**, keep a **compact** disclaimer bar on the chat route itself, **or** reuse `Footer` via a thin `PublicChatLayout` wrapper — do **not** pull in the full `PatientLayout` sidebar (that would stop being a public route)
- Patient selector → removed from the page body (handled globally by `DevIdentityBanner` in dev, or context)
- Header with title and "New Chat" → keep an **in-page** title row on `/public/chat` (portal `Header` does not wrap this route)
- Chat content (message list + input) → stays

After migration, **`ChatPage` at `/public/chat`** is a self-contained chat view (minimal chrome) so the route stays **public** and distinct from the portal. Optional: add a small link “Patient portal →” to `/` for users who land on chat first.

---

## Placeholder pages

`DashboardPage` and `DocumentsPage` start as simple placeholders during this feature:

```tsx
export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Medical History Dashboard</h1>
      <p className="text-gray-500">Your health overview will appear here.</p>
    </div>
  );
}
```

They are fully built out in Features 2 and 3 respectively.

---

## Styling approach

- Continue using **Tailwind CSS** (already configured)
- Sidebar: `bg-white border-r` with `transition-all duration-200` for collapse animation
- Active nav item: `bg-blue-50 text-blue-700 font-medium`
- Hover states: `hover:bg-gray-100`
- Page content area: `bg-gray-50` for contrast against white sidebar/header
- Consistent spacing: `p-6` for page content, `p-4` for sidebar items

---

## Implementation steps

1. **Install `react-router-dom`**
2. **Create router configuration** (`router.tsx`)
3. **Build `Sidebar` component** with nav items and responsive collapse
4. **Build `Header` component** with patient name and page title
5. **Build `Footer` component** with disclaimer
6. **Build `PatientLayout`** combining sidebar, header, footer, and `<Outlet>`
7. **Create placeholder pages** for dashboard and documents
8. **Migrate `ChatPage`** — register at **`/public/chat`**, strip duplicate chrome where the portal provides it, keep chat logic; preserve public-route semantics
9. **Update `App.tsx`** — swap to `RouterProvider` + `PatientProvider`
10. **Test all routes** — navigation, active states, responsive behavior
11. **Update Vite config** — ensure SPA fallback works for client-side routing

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Navigate to each route | Manual/E2E | Pages render correctly |
| Sidebar active state reflects current route | Frontend | Visual correctness |
| Responsive sidebar collapse at breakpoints | Manual | Layout adapts |
| Public chat at `/public/chat` loads and sends chat API requests | Integration | No regression; patient context still applies |
| Browser refresh on `/profile` loads correct page | Manual | SPA fallback configured |
| DevIdentityBanner only shows in dev mode | Frontend | Conditional rendering |

---

## Phase C extension points

When doctor features ship:
- Add `DoctorLayout` with doctor-specific nav items (Patient List, Prescriptions, AI Chat)
- Router gains a top-level role-based split: `/patient/*` → `PatientLayout`, `/doctor/*` → `DoctorLayout`
- Sidebar `navItems` become role-driven, sourced from user context

---

*Created: 2026-04-12*
