import { test, expect } from "../../fixtures/patientTest";

test("authenticated session survives a full page reload", async ({ page }) => {
  await page.goto("/patient/profile");
  await expect(page).toHaveURL(/\/patient\/profile(\/|$)/);

  await page.reload();

  // Should still be on the profile page — no redirect to login.
  await expect(page).toHaveURL(/\/patient\/profile(\/|$)/);

  // Authenticated shell is still present.
  await expect(page.getByTestId("nav-dashboard")).toBeVisible();
});
