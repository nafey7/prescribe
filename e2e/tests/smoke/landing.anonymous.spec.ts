import { test, expect } from "../../fixtures/test";
import { LandingPage } from "../../pages/LandingPage";

test("landing page renders and exposes a path to login", async ({ page }) => {
  const landing = new LandingPage(page);
  await landing.open();

  await expect(page).toHaveURL(/\/(\?|$)/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Public nav has a "Sign in" entry that routes to /login.
  await page.getByRole("link", { name: /sign in/i }).first().click();
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
