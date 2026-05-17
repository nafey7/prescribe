import { test, expect } from "../../../fixtures/patientTest";

test("clicking a fitness plan card navigates to the detail page", async ({ page }) => {
  await page.goto("/patient/fitness-plans");

  await expect(page).toHaveURL(/\/patient\/fitness-plans/);

  const cards = page
    .locator('[data-testid="plan-card"]')
    .or(page.locator('[data-testid="fitness-plan-card"]'));

  await page.waitForLoadState("networkidle");

  const count = await cards.count();
  test.skip(count === 0, "No fitness plan shares seeded");

  await cards.first().click();

  await expect(page).toHaveURL(/\/patient\/fitness-plans\/.+/);

  const planContent = page
    .getByRole("heading")
    .or(page.getByText(/monday/i))
    .or(page.getByText(/tuesday/i))
    .or(page.getByText(/wednesday/i))
    .or(page.getByText(/exercise/i))
    .or(page.getByText(/workout/i))
    .or(page.getByText(/sets/i))
    .or(page.getByText(/reps/i))
    .or(page.getByText(/fitness/i));

  await expect(planContent.first()).toBeVisible({ timeout: 10_000 });
});
