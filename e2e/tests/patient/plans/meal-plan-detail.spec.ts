import { test, expect } from "../../../fixtures/patientTest";

test("clicking a meal plan card navigates to the detail page", async ({ page }) => {
  await page.goto("/patient/meal-plans");

  await expect(page).toHaveURL(/\/patient\/meal-plans/);

  const cards = page
    .locator('[data-testid="plan-card"]')
    .or(page.locator('[data-testid="meal-plan-card"]'));

  await page.waitForLoadState("networkidle");

  const count = await cards.count();
  test.skip(count === 0, "No meal plan shares seeded");

  await cards.first().click();

  await expect(page).toHaveURL(/\/patient\/meal-plans\/.+/);

  const planContent = page
    .getByRole("heading")
    .or(page.getByText(/monday/i))
    .or(page.getByText(/tuesday/i))
    .or(page.getByText(/wednesday/i))
    .or(page.getByText(/breakfast/i))
    .or(page.getByText(/lunch/i))
    .or(page.getByText(/dinner/i))
    .or(page.getByText(/meal/i));

  await expect(planContent.first()).toBeVisible({ timeout: 10_000 });
});
