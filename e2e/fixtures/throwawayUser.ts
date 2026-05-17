/**
 * Helpers for creating short-lived throwaway users during E2E tests.
 *
 * These users are registered via POST /api/auth/signup and should be treated
 * as ephemeral — they are not cleaned up automatically between runs.
 * Use unique email patterns to avoid collisions.
 */

import type { AuthSession } from "../utils/apiClient";
import { PW_PASSWORD } from "../utils/env";

export type ThrowawayUser = {
  email: string;
  password: string;
  session: AuthSession;
};

/**
 * Extended API client type that includes the signup method.
 * Accepts any object that has both login and signup methods.
 */
export type ExtendedApiClient = {
  login(email: string, password: string): Promise<AuthSession>;
  logout(refreshToken: string | null): Promise<void>;
  signup(data: {
    email: string;
    password: string;
    role: "patient" | "doctor";
    first_name: string;
    last_name: string;
  }): Promise<AuthSession>;
};

/**
 * Create a throwaway patient account and return its credentials + session.
 * The email uses a timestamp + random suffix to ensure uniqueness across runs.
 */
export async function createThrowawayPatient(
  api: ExtendedApiClient,
): Promise<ThrowawayUser> {
  return createThrowaway(api, "patient");
}

/**
 * Create a throwaway doctor account and return its credentials + session.
 * The email uses a timestamp + random suffix to ensure uniqueness across runs.
 */
export async function createThrowawayDoctor(
  api: ExtendedApiClient,
): Promise<ThrowawayUser> {
  return createThrowaway(api, "doctor");
}

async function createThrowaway(
  api: ExtendedApiClient,
  role: "patient" | "doctor",
): Promise<ThrowawayUser> {
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const email = `e2e-${Date.now()}-${randomSuffix}@example.test`;
  const password = PW_PASSWORD;

  const session = await api.signup({
    email,
    password,
    role,
    first_name: "E2E",
    last_name: role === "patient" ? "TestPatient" : "TestDoctor",
  });

  return { email, password, session };
}
