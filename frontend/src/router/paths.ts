/**
 * Single source of truth for frontend route strings.
 *
 * All `NavLink`, `Navigate`, and programmatic `navigate(...)` calls in the app
 * MUST reference these constants instead of hard-coding URL strings. A future
 * lint rule (Phase 6) enforces this.
 *
 * The patient portal lives under `/patient/*` and the doctor portal under
 * `/doctor/*`. `/admin/*` is reserved for a future admin portal and currently
 * redirects to root in `router.tsx`.
 */
export const paths = {
  root: "/",
  login: "/login",
  signup: "/signup",
  patient: {
    root: "/patient",
    profile: "/patient/profile",
    documents: "/patient/documents",
    doctors: "/patient/doctors",
    chat: "/patient/chat",
    mealPlans: "/patient/meal-plans",
    mealPlanDetail: (shareId: string) =>
      `/patient/meal-plans/${encodeURIComponent(shareId)}`,
    profileLegacy: (userId: string) => `/patient/profile/${userId}`,
  },
  doctor: {
    root: "/doctor",
    profile: "/doctor/profile",
    patients: "/doctor/patients",
    patientDetail: (id: string) => `/doctor/patients/${id}`,
    patientDocuments: (id: string) => `/doctor/patients/${id}/documents`,
    patientChat: (id: string) => `/doctor/patients/${id}/chat`,
    patientPrescriptions: (id: string) =>
      `/doctor/patients/${id}/prescriptions`,
    connections: "/doctor/connections",
  },
  admin: {
    root: "/admin",
  },
} as const;

export type Paths = typeof paths;

/**
 * Legacy paths kept only for redirect entries in `router.tsx`. New code must
 * use `paths.*` directly. Each maps to its `/patient/*` replacement.
 */
export const legacyRedirects: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/home", to: paths.patient.root },
  { from: "/profile", to: paths.patient.profile },
  { from: "/documents", to: paths.patient.documents },
  { from: "/dashboard", to: paths.patient.root },
  { from: "/public/chat", to: paths.patient.chat },
];
