export interface FeatureFlags {
  ai_suggestions_enabled: boolean;
  /** Mirrors backend `auth_bypass_allowed()`: legacy headers without JWT (only local/test + AUTH_REQUIRED off). */
  auth_relaxed: boolean;
  /** True when backend `Settings.ALLOW_DOCTOR_SELF_SIGNUP` is on; landing page exposes the doctor signup tab. */
  allow_doctor_self_signup: boolean;
}
