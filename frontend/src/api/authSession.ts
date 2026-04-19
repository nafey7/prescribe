import { getApiBase } from "./env";

export const ACCESS_TOKEN_STORAGE_KEY = "prescribe_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "prescribe_refresh_token";
const LOGOUT_BROADCAST_KEY = "prescribe_auth_logout_ts";

type AuthSessionHandlers = {
  getAccessToken: () => string;
  getRefreshToken: () => string;
  /** Persist new tokens after a successful refresh (memory + sessionStorage). */
  onTokenPairRefreshed: (access: string, refresh: string) => void;
  /** Clear client auth state (sessionStorage + memory). */
  clearSession: () => void;
  /** Navigate to login after refresh failure (e.g. returnUrl). */
  onRefreshFailed: () => void;
};

let handlers: AuthSessionHandlers | null = null;

let refreshPromise: Promise<boolean> | null = null;

export function configureAuthSession(next: AuthSessionHandlers | null): void {
  handlers = next;
}

export function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(
      padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4))
    );
    const obj = JSON.parse(json) as { exp?: number };
    return typeof obj.exp === "number" ? obj.exp : null;
  } catch {
    return null;
  }
}

/** Paths that must not trigger refresh+retry on 401 (matches `/api/auth/...` and absolute URLs). */
export function isAuthRefreshExemptPath(path: string): boolean {
  const p = path.split("?")[0] ?? path;
  return (
    p.includes("/auth/refresh") ||
    p.includes("/auth/login") ||
    p.includes("/auth/signup") ||
    p.includes("/auth/logout")
  );
}

export function broadcastLogoutToOtherTabs(): void {
  try {
    localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function subscribeLogoutFromOtherTabs(onLogout: () => void): () => void {
  const fn = (ev: StorageEvent) => {
    if (ev.key === LOGOUT_BROADCAST_KEY && ev.newValue != null) {
      onLogout();
    }
  };
  window.addEventListener("storage", fn);
  return () => window.removeEventListener("storage", fn);
}

type TokenRefreshResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false };

async function postRefresh(refreshToken: string): Promise<TokenRefreshResult> {
  const res = await fetch(`${getApiBase()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    return { ok: false };
  }
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!data.access_token || !data.refresh_token) {
    return { ok: false };
  }
  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

/**
 * Single-flight refresh used by RTK `baseQuery` and `apiFetch`.
 * Returns true if a usable access token is available afterward.
 */
export async function ensureFreshAccessToken(): Promise<boolean> {
  if (!handlers) {
    return false;
  }
  const access = handlers.getAccessToken();
  const exp = access ? decodeJwtExp(access) : null;
  const now = Date.now() / 1000;
  if (access && exp != null && exp > now + 30) {
    return true;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const h = handlers;
    if (!h) return false;
    const rt = h.getRefreshToken();
    if (!rt) {
      h.clearSession();
      h.onRefreshFailed();
      return false;
    }
    const result = await postRefresh(rt);
    if (!result.ok) {
      h.clearSession();
      broadcastLogoutToOtherTabs();
      h.onRefreshFailed();
      return false;
    }
    h.onTokenPairRefreshed(result.access_token, result.refresh_token);
    return true;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
