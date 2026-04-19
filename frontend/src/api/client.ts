import {
  ensureFreshAccessToken,
  isAuthRefreshExemptPath,
} from "./authSession";
import { getApiBase as getApiBaseUrl } from "./env";

let getPatientId: () => string = () => "";
let getDoctorId: () => string = () => "";
let getAccessToken: () => string = () => "";

/** Called from PatientProvider so API calls include the active dev identity. */
export function registerPatientIdGetter(fn: () => string): void {
  getPatientId = fn;
}

/** Called from IdentityProvider — non-empty only in doctor dev mode. */
export function registerDoctorIdGetter(fn: () => string): void {
  getDoctorId = fn;
}

/** Called from AuthProvider — non-empty when logged in (Bearer sent; dev headers omitted). */
export function registerAccessTokenGetter(fn: () => string): void {
  getAccessToken = fn;
}

export function getApiBase(): string {
  return getApiBaseUrl();
}

export type ApiFetchOptions = RequestInit & {
  /** Skip X-Patient-Id (e.g. bootstrap patient list before identity is required). */
  skipPatientHeader?: boolean;
  /** Do not run 401 → refresh → retry (auth endpoints). */
  skipAuthRefresh?: boolean;
};

export type ApplyPrescribeHeadersOptions = {
  skipPatientHeader?: boolean;
  /** When body is a string and Content-Type is unset, set application/json (matches apiFetch). */
  body?: BodyInit | null;
};

/**
 * Mutates and returns `headers` with dev identity and JSON Content-Type rules
 * aligned with `apiFetch`. Use from RTK `fetchBaseQuery` wrappers and SSE helpers.
 * When an access token is registered, sends `Authorization: Bearer` and omits dev headers.
 */
export function applyPrescribeHeaders(
  headers: Headers,
  options?: ApplyPrescribeHeadersOptions
): Headers {
  const token = getAccessToken().trim();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    return finalizeJsonContentType(headers, options?.body);
  }

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
  return finalizeJsonContentType(headers, options?.body);
}

function finalizeJsonContentType(
  headers: Headers,
  body: BodyInit | null | undefined
): Headers {
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
  const { skipPatientHeader, skipAuthRefresh, ...rest } = init ?? {};

  const doFetch = (): Promise<Response> => {
    const headers = new Headers(rest.headers);
    applyPrescribeHeaders(headers, { skipPatientHeader, body: rest.body });
    return fetch(`${getApiBaseUrl()}${path}`, { ...rest, headers });
  };

  let res = await doFetch();
  const exempt = skipAuthRefresh || isAuthRefreshExemptPath(path);

  if (res.status === 401 && !exempt) {
    const ok = await ensureFreshAccessToken();
    if (ok) {
      res = await doFetch();
    }
  }
  return res;
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
