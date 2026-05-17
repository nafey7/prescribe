/**
 * Feature flags fetched from the backend config endpoint.
 *
 * Usage:
 *   const flags = await fetchFeatureFlags(request);
 *   test.skip(!flags.AI_SUGGESTIONS_ENABLED, "AI suggestions not enabled");
 */

import type { APIRequestContext } from "@playwright/test";
import { PW_API_URL } from "./env";

const FEATURES_URL = `${PW_API_URL}/api/config/features`;

export type FeatureFlags = {
  ALLOW_DOCTOR_SELF_SIGNUP: boolean;
  AI_SUGGESTIONS_ENABLED: boolean;
  auth_relaxed: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  ALLOW_DOCTOR_SELF_SIGNUP: false,
  AI_SUGGESTIONS_ENABLED: false,
  auth_relaxed: false,
};

/**
 * Fetch feature flags from GET /api/config/features.
 * Returns defaults (all false) if the request fails or the server is
 * unreachable, so callers can still make skip decisions safely.
 */
export async function fetchFeatureFlags(
  request: APIRequestContext,
): Promise<FeatureFlags> {
  try {
    const res = await request.get(FEATURES_URL, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok()) {
      return { ...DEFAULT_FLAGS };
    }
    const body = (await res.json()) as Partial<FeatureFlags>;
    return {
      ALLOW_DOCTOR_SELF_SIGNUP: body.ALLOW_DOCTOR_SELF_SIGNUP ?? false,
      AI_SUGGESTIONS_ENABLED: body.AI_SUGGESTIONS_ENABLED ?? false,
      auth_relaxed: body.auth_relaxed ?? false,
    };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}
