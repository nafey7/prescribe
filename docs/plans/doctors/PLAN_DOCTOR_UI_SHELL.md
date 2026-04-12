# Feature 4: Doctor UI Shell & Navigation

Adds a doctor-specific portal layout with routing, sidebar navigation, and responsive design — parallel to the Phase B `PatientLayout` but with doctor-centric navigation. Also introduces role-based route splitting so the app can serve both patient and doctor portals from a single React application.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 4th (after Doctor–Patient Connections)

**Auth:** No login, signup, or token storage in this plan — authentication is Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md). Role selection uses the dev identity picker.

---

## Problem

Phase B created a `PatientLayout` shell for patient portal pages. Phase C needs an equivalent doctor portal with:

1. A `DoctorLayout` with doctor-specific sidebar navigation
2. Route splitting: `/doctor/*` for doctor pages, `/` (and existing paths) for patient pages
3. Role-aware navigation in the dev banner that routes to the correct portal
4. Placeholder pages for all doctor routes that later features fill in
5. A structure that coexists with the patient portal without conflicts

---

## Design

### Route structure

| Path | Page component | Layout | Description |
|------|---------------|--------|-------------|
| `/doctor` | `DoctorDashboardPage` | `DoctorLayout` | Doctor's home dashboard (Feature 6) |
| `/doctor/profile` | `DoctorProfilePage` | `DoctorLayout` | Doctor's own profile (Feature 2) |
| `/doctor/patients` | `DoctorPatientListPage` | `DoctorLayout` | Connected patient list (Feature 5) |
| `/doctor/patients/:patientId` | `DoctorPatientDetailPage` | `DoctorLayout` | Patient detail view (Feature 5) |
| `/doctor/patients/:patientId/chat` | `DoctorChatPage` | `DoctorLayout` | AI chat for patient (Feature 7) |
| `/doctor/patients/:patientId/prescriptions` | `DoctorPrescriptionsPage` | `DoctorLayout` | Patient prescriptions (Feature 8) |
| `/doctor/connections` | `DoctorConnectionsPage` | `DoctorLayout` | Manage connection requests (Feature 3) |

Patient portal routes remain at their existing paths (`/`, `/profile`, `/documents`, `/connections`, `/prescriptions`).

### Layout architecture

Doctor portal routes (`/doctor/*`):

```
┌─────────────────────────────────────────────────┐
│  DevIdentityBanner (dev mode, role=doctor)       │
├────────┬────────────────────────────────────────┤
│        │  Header (Dr. name, breadcrumbs)        │
│  Side  ├────────────────────────────────────────┤
│  bar   │                                        │
│        │            Page Content                │
│  Nav   │          (router outlet)               │
│  (Dr.) │                                        │
│        │                                        │
├────────┴────────────────────────────────────────┤
│  Footer (disclaimer, educational notice)        │
└─────────────────────────────────────────────────┘
```

### Sidebar navigation (doctor)

| Icon | Label | Path | Badge |
|------|-------|------|-------|
| Home | Dashboard | `/doctor` | — |
| Users | My Patients | `/doctor/patients` | Connected count |
| Link | Connections | `/doctor/connections` | Pending request count |
| User | My Profile | `/doctor/profile` | — |

Active state: highlighted background, bold text — same visual treatment as patient sidebar.

The sidebar is data-driven for easy extension:

```tsx
const doctorNavItems = [
  { path: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { path: "/doctor/patients", label: "My Patients", icon: Users },
  { path: "/doctor/connections", label: "Connections", icon: Link2, badge: pendingCount },
  { path: "/doctor/profile", label: "My Profile", icon: UserCircle },
];
```

### Header (doctor)

- Left: Doctor name and role badge ("Doctor") + specialization
- Center: Page title / breadcrumb
- Right: placeholder for notifications (future) and avatar (Phase E)

When viewing a specific patient (`/doctor/patients/:patientId/*`), the header shows a **patient context bar**:

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Patients  │  Viewing: John Doe (Male, 58) │
│                       │  [Profile] [Documents] [Chat] [Prescriptions] │
└──────────────────────────────────────────────────────┘
```

This sub-navigation bar lets the doctor quickly switch between a patient's views without going back to the list.

### Responsive behavior

| Breakpoint | Sidebar | Layout |
|------------|---------|--------|
| ≥1024px (desktop) | Always visible, 240px wide | Side-by-side |
| 768–1023px (tablet) | Collapsed to icons (64px), expand on hover | Compact |
| <768px (mobile) | Hidden, hamburger toggle overlay | Full-width content |

Same breakpoints and behavior as `PatientLayout` for consistency.

---

## Implementation

### New files

| File | Purpose |
|------|---------|
| `frontend/src/layouts/DoctorLayout.tsx` | Shared doctor shell: sidebar + header + outlet |
| `frontend/src/components/doctor/DoctorSidebar.tsx` | Doctor navigation sidebar |
| `frontend/src/components/doctor/DoctorHeader.tsx` | Doctor header bar |
| `frontend/src/components/doctor/PatientContextBar.tsx` | Sub-nav when viewing a specific patient |
| `frontend/src/pages/doctor/DoctorDashboardPage.tsx` | Placeholder (built out in Feature 6) |
| `frontend/src/pages/doctor/DoctorPatientListPage.tsx` | Placeholder (built out in Feature 5) |
| `frontend/src/pages/doctor/DoctorPatientDetailPage.tsx` | Placeholder (built out in Feature 5) |
| `frontend/src/pages/doctor/DoctorChatPage.tsx` | Placeholder (built out in Feature 7) |
| `frontend/src/pages/doctor/DoctorPrescriptionsPage.tsx` | Placeholder (built out in Feature 8) |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/router.tsx` | Add `/doctor/*` route tree under `DoctorLayout` |
| `frontend/src/components/DevIdentityBanner.tsx` | Role switch navigates to correct portal root |
| `frontend/src/index.css` | Add doctor-specific utility classes if needed |

---

### Router setup (updated `frontend/src/router.tsx`)

```tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import PatientLayout from "./layouts/PatientLayout";
import DoctorLayout from "./layouts/DoctorLayout";

// Patient pages (existing)
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import PatientConnectionsPage from "./pages/PatientConnectionsPage";
import PatientPrescriptionsPage from "./pages/PatientPrescriptionsPage";

// Doctor pages (new)
import DoctorDashboardPage from "./pages/doctor/DoctorDashboardPage";
import DoctorProfilePage from "./pages/doctor/DoctorProfilePage";
import DoctorPatientListPage from "./pages/doctor/DoctorPatientListPage";
import DoctorPatientDetailPage from "./pages/doctor/DoctorPatientDetailPage";
import DoctorChatPage from "./pages/doctor/DoctorChatPage";
import DoctorPrescriptionsPage from "./pages/doctor/DoctorPrescriptionsPage";
import DoctorConnectionsPage from "./pages/doctor/DoctorConnectionsPage";

export const router = createBrowserRouter([
  // Patient portal
  {
    path: "/",
    element: <PatientLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "connections", element: <PatientConnectionsPage /> },
      { path: "prescriptions", element: <PatientPrescriptionsPage /> },
    ],
  },
  // Doctor portal
  {
    path: "/doctor",
    element: <DoctorLayout />,
    children: [
      { index: true, element: <DoctorDashboardPage /> },
      { path: "profile", element: <DoctorProfilePage /> },
      { path: "patients", element: <DoctorPatientListPage /> },
      { path: "patients/:patientId", element: <DoctorPatientDetailPage /> },
      { path: "patients/:patientId/chat", element: <DoctorChatPage /> },
      { path: "patients/:patientId/prescriptions", element: <DoctorPrescriptionsPage /> },
      { path: "connections", element: <DoctorConnectionsPage /> },
    ],
  },
  // Legacy public chat — redirect to doctor portal
  { path: "/public/chat", element: <Navigate to="/doctor" replace /> },
  { path: "/dashboard", element: <Navigate to="/" replace /> },
]);
```

### DoctorLayout component

```tsx
import { Outlet, useParams } from "react-router-dom";
import DoctorSidebar from "../components/doctor/DoctorSidebar";
import DoctorHeader from "../components/doctor/DoctorHeader";
import PatientContextBar from "../components/doctor/PatientContextBar";
import Footer from "../components/Footer";
import DevIdentityBanner from "../components/DevIdentityBanner";

export default function DoctorLayout() {
  const { patientId } = useParams();

  return (
    <div className="flex flex-col h-screen">
      {import.meta.env.DEV && <DevIdentityBanner />}
      <div className="flex flex-1 overflow-hidden">
        <DoctorSidebar />
        <div className="flex flex-col flex-1">
          <DoctorHeader />
          {patientId && <PatientContextBar patientId={patientId} />}
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

---

## Styling approach

- **Color differentiation:** Doctor portal uses a subtle teal/green accent (`bg-teal-50`, `text-teal-700` for active nav) to visually distinguish from the patient portal's blue accent. This makes it immediately clear which portal you're in during dev testing.
- Continue using **Tailwind CSS**
- Same spacing, typography, and responsive patterns as `PatientLayout`
- Sidebar: `bg-white border-r` with collapse animation
- Active nav: `bg-teal-50 text-teal-700 font-medium`

---

## Placeholder pages

All doctor pages start as simple placeholders during this feature:

```tsx
export default function DoctorDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Doctor Dashboard</h1>
      <p className="text-gray-500">Your dashboard will appear here.</p>
    </div>
  );
}
```

They are fully built out in Features 5–8.

---

## Implementation steps

1. **Create `DoctorSidebar` component** with nav items and responsive collapse
2. **Create `DoctorHeader` component** with doctor name and breadcrumbs
3. **Create `PatientContextBar`** for patient-specific sub-navigation
4. **Create `DoctorLayout`** combining sidebar, header, optional patient bar, footer, and `<Outlet>`
5. **Create all placeholder pages** for doctor routes
6. **Update `router.tsx`** with doctor route tree
7. **Update `DevIdentityBanner`** — role switch navigates to `/doctor` or `/`
8. **Test navigation** — all routes render, sidebar active states, responsive behavior
9. **Verify patient portal** still works without regression

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Navigate to each doctor route | Manual/E2E | Pages render correctly |
| Doctor sidebar active state reflects current route | Frontend | Visual correctness |
| Patient context bar appears on patient-specific routes | Frontend | `useParams` wiring |
| Responsive sidebar collapse at breakpoints | Manual | Layout adapts |
| Role switch in dev banner navigates to correct portal | Frontend | `/doctor` ↔ `/` |
| Patient portal routes still work | Regression | No breaking changes |
| Browser refresh on `/doctor/patients` loads correctly | Manual | SPA fallback |

---

## Phase E extension points

When auth ships:
- Router wraps doctor routes with an auth guard that checks `role === "doctor"`
- `DoctorLayout` sources doctor identity from auth context instead of dev picker
- Patient portal routes are guarded for `role === "patient"`
- Unauthorized access redirects to login page

---

*Created: 2026-04-12*
