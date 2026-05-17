import { test, expect } from "../../../fixtures/patientTest";

test("meal plan detail page offers a PDF download", async ({ page }) => {
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

  const downloadButton = page
    .getByRole("button", { name: /download pdf/i })
    .or(page.getByRole("link", { name: /download pdf/i }))
    .or(page.getByRole("button", { name: /download/i }))
    .or(page.getByRole("link", { name: /pdf/i }));

  await expect(downloadButton.first()).toBeVisible({ timeout: 10_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.first().click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/meal.*plan.*\.pdf|\.pdf/i);
});
