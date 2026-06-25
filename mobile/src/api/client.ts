import { getApiBaseUrl } from "../config/env";

type ApiRequestOptions = RequestInit & {
  accessToken?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { accessToken, headers: incomingHeaders, body, ...rest } = options;
  const headers = new Headers(incomingHeaders);

  if (body != null && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    body,
    headers,
  });

  if (!response.ok) {
    const detail = await readResponseBody(response);
    throw new ApiError(getErrorMessage(detail, response.status), response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(detail: unknown, status: number): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (isRecord(detail) && typeof detail.detail === "string") return detail.detail;
  return `Request failed (${status})`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
