import { test, expect } from "../../fixtures/test";

test("clicking 'Create account' tab from /login navigates to /signup", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("auth-tab-signup").click();
  await expect(page).toHaveURL(/\/signup(\?|$)/);
});

test("clicking 'Sign in' tab from /signup navigates to /login", async ({ page }) => {
  await page.goto("/signup");
  await page.getByTestId("auth-tab-login").click();
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test("navigating to /?auth=signup redirects to /signup", async ({ page }) => {
  await page.goto("/?auth=signup");
  await expect(page).toHaveURL(/\/signup(\?|$)/);
});

test("navigating to /?auth=login redirects to /login", async ({ page }) => {
  await page.goto("/?auth=login");
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
