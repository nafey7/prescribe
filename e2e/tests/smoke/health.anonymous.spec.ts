import { test, expect } from "../../fixtures/test";
import { HEALTH_URL } from "../../utils/env";

test("backend /health returns 200 with status ok", async ({ request }) => {
  const res = await request.get(HEALTH_URL);
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok" });
});
