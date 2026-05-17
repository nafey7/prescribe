import { test, expect } from "../../fixtures/patientTest";

test("patient accessing /doctor/patients is redirected away", async ({ page }) => {
  await page.goto("/doctor/patients");

  // The role-guard in ProtectedAppShell redirects patients away from the
  // /doctor/* namespace. The final URL must NOT remain at /doctor/patients.
  await expect(page).not.toHaveURL(/\/doctor\/patients(\/|$)/, { timeout: 10_000 });

  // The patient should land either in the patient portal or on the landing page.
  const url = page.url();
  const isPatientPortal = /\/patient(\/|$)/.test(url);
  const isLanding = /^\/?(\?|#|$)/.test(new URL(url).pathname);
  expect(isPatientPortal || isLanding).toBe(true);
});

test("patient accessing /doctor/profile is redirected away", async ({ page }) => {
  await page.goto("/doctor/profile");

  // URL must not stay on /doctor/profile after the role guard fires.
  await expect(page).not.toHaveURL(/\/doctor\/profile(\/|$)/, { timeout: 10_000 });

  const url = page.url();
  const isPatientPortal = /\/patient(\/|$)/.test(url);
  const isLanding = /^\/?(\?|#|$)/.test(new URL(url).pathname);
  expect(isPatientPortal || isLanding).toBe(true);
});
