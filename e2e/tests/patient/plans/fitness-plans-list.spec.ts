import { test, expect } from "../../../fixtures/patientTest";

test("fitness plans list page loads and shows content or empty state", async ({ page }) => {
  await page.goto("/patient/fitness-plans");

  await expect(page).toHaveURL(/\/patient\/fitness-plans/);

  await expect(page.getByRole("heading", { name: /fitness plan/i }).first()).toBeVisible({ timeout: 10_000 });

  const planCards = page
    .locator('[data-testid="plan-card"]')
    .or(page.getByRole("link").filter({ hasText: /plan/i }))
    .or(page.locator('[data-testid="fitness-plan-card"]'));

  const emptyState = page
    .getByText(/no fitness plans/i)
    .or(page.getByText(/no plans/i))
    .or(page.getByText(/no shared plans/i))
    .or(page.getByText(/empty/i));

  const cardCount = await planCards.count();
  if (cardCount > 0) {
    await expect(planCards.first()).toBeVisible();
  } else {
    await expect(emptyState.first()).toBeVisible({ timeout: 10_000 });
  }
});
