/** Shared API origin for fetch wrappers (avoids import cycles between client and auth session). */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export function getApiBase(): string {
  return API_BASE_URL;
}
