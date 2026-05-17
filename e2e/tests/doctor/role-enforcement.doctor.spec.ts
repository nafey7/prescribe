import { test, expect } from "../../fixtures/doctorTest";

test("doctor accessing /patient/profile is redirected away", async ({ page }) => {
  await page.goto("/patient/profile");

  // The role-guard in ProtectedAppShell redirects doctors away from the
  // /patient/* namespace. The final URL must NOT remain at /patient/profile.
  await expect(page).not.toHaveURL(/\/patient\/profile(\/|$)/, { timeout: 10_000 });

  // The doctor should land in the doctor portal or on the landing page.
  const url = page.url();
  const isDoctorPortal = /\/doctor(\/|$)/.test(url);
  const isLanding = /^\/?(\?|#|$)/.test(new URL(url).pathname);
  expect(isDoctorPortal || isLanding).toBe(true);
});
