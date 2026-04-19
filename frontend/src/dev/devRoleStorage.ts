/** Dev identity picker (localStorage) — shared by IdentityContext and landing bypass. */

export const DEV_ROLE_STORAGE_KEY = "prescribe_dev_role";
export const DEV_DOCTOR_ID_KEY = "prescribe_dev_doctor_id";

export type DevRole = "patient" | "doctor";

export function readStoredDevRole(): DevRole {
  try {
    const v = localStorage.getItem(DEV_ROLE_STORAGE_KEY);
    if (v === "doctor" || v === "patient") return v;
  } catch {
    /* ignore */
  }
  return "patient";
}

export function persistDevRole(role: DevRole): void {
  try {
    localStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function readStoredDoctorId(): string | null {
  try {
    return localStorage.getItem(DEV_DOCTOR_ID_KEY);
  } catch {
    return null;
  }
}

export function persistDoctorId(id: string): void {
  try {
    localStorage.setItem(DEV_DOCTOR_ID_KEY, id);
  } catch {
    /* ignore */
  }
}
