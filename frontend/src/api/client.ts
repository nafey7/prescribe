const API_BASE = import.meta.env.VITE_API_URL || "/api";

let getPatientId: () => string = () => "";

/** Called from PatientProvider so API calls include the active dev identity. */
export function registerPatientIdGetter(fn: () => string): void {
  getPatientId = fn;
}

export function getApiBase(): string {
  return API_BASE;
}

export type ApiFetchOptions = RequestInit & {
  /** Skip X-Patient-Id (e.g. bootstrap patient list before identity is required). */
  skipPatientHeader?: boolean;
};

export async function apiFetch(
  path: string,
  init?: ApiFetchOptions
): Promise<Response> {
  const { skipPatientHeader, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!skipPatientHeader) {
    const id = getPatientId();
    if (id) {
      headers.set("X-Patient-Id", id);
    }
  }
  if (
    rest.body != null &&
    typeof rest.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
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
