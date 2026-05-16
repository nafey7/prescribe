/**
 * Centralized env reads for the E2E suite.
 *
 * The runner reads from `process.env`; values are populated by Playwright's
 * config (which can dotenv-load if needed) or directly by the shell. Tests
 * never hardcode the seed password — only the env name.
 */

function readEnv(name: string, fallback: string | undefined): string | undefined {
  const value = process.env[name];
  if (value !== undefined && value !== "") return value;
  return fallback;
}

function requireEnv(name: string, fallback: string | undefined, hint: string): string {
  const value = readEnv(name, fallback);
  if (!value) {
    throw new Error(
      `[e2e] Required env var ${name} is not set. ${hint}`,
    );
  }
  return value;
}

export const PW_BASE_URL = readEnv("PW_BASE_URL", "http://localhost:5173")!;
export const PW_API_URL = readEnv("PW_API_URL", "http://localhost:8000")!;

export const PW_PATIENT_EMAIL = readEnv(
  "PW_PATIENT_EMAIL",
  "john@example.com",
)!;

export const PW_DOCTOR_EMAIL = readEnv("PW_DOCTOR_EMAIL", "sarah@example.com")!;

export const PW_PASSWORD = requireEnv(
  "PW_PASSWORD",
  process.env.DEV_DEFAULT_PASSWORD,
  "Set PW_PASSWORD or DEV_DEFAULT_PASSWORD in your shell or .env (e.g. PW_PASSWORD=Unity123.).",
);

/** Health endpoint sits at `${api}/health`, not `${api}/api/health`. */
export const HEALTH_URL = `${PW_API_URL}/health`;

/** Login endpoint sits at `${api}/api/auth/login`. */
export const LOGIN_URL = `${PW_API_URL}/api/auth/login`;

/** Logout endpoint sits at `${api}/api/auth/logout`. */
export const LOGOUT_URL = `${PW_API_URL}/api/auth/logout`;
