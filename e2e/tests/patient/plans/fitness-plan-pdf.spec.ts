import { test, expect } from "../../../fixtures/patientTest";

test("fitness plan detail page offers a PDF download", async ({ page }) => {
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

  expect(download.suggestedFilename()).toMatch(/fitness.*plan.*\.pdf|\.pdf/i);
});
