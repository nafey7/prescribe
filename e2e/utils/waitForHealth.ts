import { request } from "@playwright/test";
import { HEALTH_URL } from "./env";

export type WaitForHealthOptions = {
  url?: string;
  timeoutMs?: number;
  intervalMs?: number;
};

/**
 * Polls the backend `/health` endpoint until it returns 200 or the timeout
 * elapses. Throws a single actionable error if the stack is not reachable.
 */
export async function waitForHealth(
  options: WaitForHealthOptions = {},
): Promise<void> {
  const url = options.url ?? HEALTH_URL;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 500;
  const ctx = await request.newContext();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  try {
    while (Date.now() < deadline) {
      try {
        const res = await ctx.get(url, { timeout: 5_000 });
        if (res.ok()) return;
        lastError = new Error(`status ${res.status()}`);
      } catch (err) {
        lastError = err;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } finally {
    await ctx.dispose();
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `[e2e] Backend not reachable at ${url} after ${timeoutMs}ms (last error: ${detail}). Run \`docker compose up -d\` from the repo root first.`,
  );
}
