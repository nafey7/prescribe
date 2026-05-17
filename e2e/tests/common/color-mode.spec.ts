import { test, expect } from "../../fixtures/patientTest";

const STORAGE_KEY = "prescribe-color-mode";

test("theme toggle button switches color mode and persists across reload", async ({ page }) => {
  await page.goto("/patient");
  await expect(page).toHaveURL(/\/patient(\/|$)/, { timeout: 15_000 });

  // Read the current mode from localStorage (defaults to "dark" when unset).
  const initialMode = await page.evaluate(
    (key) => localStorage.getItem(key) ?? "dark",
    STORAGE_KEY,
  );

  // Locate the ThemeToggleButton. It lives in the sidebar brand row and
  // carries an aria-label of "Switch to light mode" (when dark) or
  // "Switch to dark mode" (when light).
  const toggleButton = page
    .getByRole("button", { name: /switch to (light|dark) mode/i })
    .or(page.locator('[aria-label*="mode" i]').filter({ hasText: "" }).first())
    .first();

  await expect(toggleButton).toBeVisible({ timeout: 10_000 });
  await toggleButton.click();

  // After clicking, localStorage must reflect the new mode.
  const modeAfterToggle = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );

  const expectedModeAfterToggle = initialMode === "dark" ? "light" : "dark";
  expect(modeAfterToggle).toBe(expectedModeAfterToggle);

  // Reload and assert localStorage value persists.
  await page.reload();
  await expect(page).toHaveURL(/\/patient(\/|$)/, { timeout: 15_000 });

  const modeAfterReload = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );

  expect(modeAfterReload).toBe(expectedModeAfterToggle);
});
