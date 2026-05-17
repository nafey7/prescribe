import { test, expect } from "../../fixtures/test";

test("when ALLOW_DOCTOR_SELF_SIGNUP is false the Doctor role toggle is hidden on the signup page", async ({
  page,
}) => {
  // Intercept the feature-flags endpoint before the page loads.
  await page.route("**/api/config/features", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        allow_doctor_self_signup: false,
        ai_suggestions_enabled: false,
        auth_relaxed: false,
      }),
    });
  });

  await page.goto("/signup");

  // The Doctor toggle button must NOT be visible when the flag is disabled.
  const doctorToggle = page.getByRole("button", { name: /doctor/i });
  await expect(doctorToggle).not.toBeVisible({ timeout: 10_000 });
});

test("when ALLOW_DOCTOR_SELF_SIGNUP is true the Doctor role toggle is visible on the signup page", async ({
  page,
}) => {
  // Intercept the feature-flags endpoint before the page loads.
  await page.route("**/api/config/features", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        allow_doctor_self_signup: true,
        ai_suggestions_enabled: true,
        auth_relaxed: false,
      }),
    });
  });

  await page.goto("/signup");

  // Navigate to the "Create account" tab so the signup form is fully visible.
  const signupTab = page.getByTestId("auth-tab-signup");
  const hasTab = await signupTab.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hasTab) {
    await signupTab.click();
  }

  // The Doctor toggle button MUST be visible when the flag is enabled.
  const doctorToggle = page.getByRole("button", { name: /doctor/i });
  await expect(doctorToggle).toBeVisible({ timeout: 10_000 });
});
