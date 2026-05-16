import type { APIRequestContext } from "@playwright/test";
import { LOGIN_URL, LOGOUT_URL } from "./env";

/** Subset of the backend's MeResponse shape we care about in E2E. */
export type AuthUser = {
  id: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  first_name?: string;
  last_name?: string;
};

/** Backend snake_case response from POST /api/auth/login. */
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

/**
 * Thin typed wrapper around Playwright's request context for the handful of
 * auth endpoints the suite drives directly. Intentionally does NOT transform
 * casing — E2E should see the same wire contract the frontend does.
 */
export function createApiClient(ctx: APIRequestContext) {
  return {
    async login(email: string, password: string): Promise<AuthSession> {
      const res = await ctx.post(LOGIN_URL, {
        data: { email, password },
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok()) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `[e2e] Login failed for ${email} (${res.status()}). ${body}\nHint: check DEV_DEFAULT_PASSWORD and run \`docker compose exec backend python -m seed\`.`,
        );
      }
      return (await res.json()) as AuthSession;
    },
    async logout(refreshToken: string | null): Promise<void> {
      await ctx.post(LOGOUT_URL, {
        data: { refresh_token: refreshToken },
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
