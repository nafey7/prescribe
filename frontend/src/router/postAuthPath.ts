import type { UserRole } from "../types/auth";
import { paths } from "./paths";

/** Where to send a freshly authenticated user when no `returnUrl` is set. */
export function defaultPostAuthPath(role: UserRole): string {
  if (role === "doctor") return paths.doctor.root;
  if (role === "admin") return paths.root;
  return paths.patient.root;
}

/**
 * Validate a candidate post-auth destination.
 *
 * Rules (defense-in-depth against open-redirect class issues + role mismatch):
 *  - must be a same-origin path (start with single `/`, not `//`)
 *  - root `/` falls back to the role home so we don't bounce on the landing
 *  - cross-role paths fall back (e.g. patient should not be sent to `/doctor/...`)
 */
export function safeReturnUrl(
  raw: string | null | undefined,
  role: UserRole
): string {
  const fallback = defaultPostAuthPath(role);
  if (!raw || typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw === paths.root) return fallback;

  if (raw === paths.doctor.root || raw.startsWith(`${paths.doctor.root}/`)) {
    return role === "doctor" ? raw : fallback;
  }
  if (raw === paths.patient.root || raw.startsWith(`${paths.patient.root}/`)) {
    return role === "patient" ? raw : fallback;
  }
  if (raw === paths.admin.root || raw.startsWith(`${paths.admin.root}/`)) {
    return role === "admin" ? raw : fallback;
  }
  return raw;
}
