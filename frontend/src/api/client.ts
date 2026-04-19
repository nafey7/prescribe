const API_BASE = import.meta.env.VITE_API_URL || "/api";

let getPatientId: () => string = () => "";
let getDoctorId: () => string = () => "";

/** Called from PatientProvider so API calls include the active dev identity. */
export function registerPatientIdGetter(fn: () => string): void {
  getPatientId = fn;
}

/** Called from IdentityProvider — non-empty only in doctor dev mode. */
export function registerDoctorIdGetter(fn: () => string): void {
  getDoctorId = fn;
}

export function getApiBase(): string {
  return API_BASE;
}

export type ApiFetchOptions = RequestInit & {
  /** Skip X-Patient-Id (e.g. bootstrap patient list before identity is required). */
  skipPatientHeader?: boolean;
};

export type ApplyPrescribeHeadersOptions = {
  skipPatientHeader?: boolean;
  /** When body is a string and Content-Type is unset, set application/json (matches apiFetch). */
  body?: BodyInit | null;
};

/**
 * Mutates and returns `headers` with dev identity and JSON Content-Type rules
 * aligned with `apiFetch`. Use from RTK `fetchBaseQuery` wrappers and SSE helpers.
 */
export function applyPrescribeHeaders(
  headers: Headers,
  options?: ApplyPrescribeHeadersOptions
): Headers {
  const skipPatientHeader = options?.skipPatientHeader ?? false;
  if (!skipPatientHeader) {
    const id = getPatientId();
    if (id) {
      headers.set("X-Patient-Id", id);
    }
  }
  const doctorId = getDoctorId();
  if (doctorId) {
    headers.set("X-Doctor-Id", doctorId);
  }
  const body = options?.body;
  if (
    body != null &&
    typeof body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function apiFetch(
  path: string,
  init?: ApiFetchOptions
): Promise<Response> {
  const { skipPatientHeader, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  applyPrescribeHeaders(headers, { skipPatientHeader, body: rest.body });
  return fetch(`${API_BASE}${path}`, { ...rest, headers });
}

export async function apiRequest<T>(
  path: string,
  init?: ApiFetchOptions
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
