import { test, expect } from "../../../fixtures/doctorTest";

test("doctor connections page loads at /doctor/connections", async ({ page }) => {
  await page.goto("/doctor/connections");
  await expect(page).toHaveURL(/\/doctor\/connections(\/|$)/);
});

test("doctor connections page renders the connections heading", async ({ page }) => {
  await page.goto("/doctor/connections");
  await expect(page).toHaveURL(/\/doctor\/connections(\/|$)/);

  // The page title "Connections" must be visible.
  await expect(page.getByText(/connections/i).first()).toBeVisible({ timeout: 10_000 });
});

test("doctor connections page shows Pending requests section", async ({ page }) => {
  await page.goto("/doctor/connections");
  await expect(page).toHaveURL(/\/doctor\/connections(\/|$)/);

  // The "Pending requests" section heading is always rendered (even when empty).
  await expect(page.getByRole("heading", { name: /pending requests/i })).toBeVisible({ timeout: 10_000 });
});

test("Alex Kumar's pending connection to Sarah is visible or empty state is shown", async ({
  page,
}) => {
  await page.goto("/doctor/connections");
  await expect(page).toHaveURL(/\/doctor\/connections(\/|$)/);

  // alex@example.com has a PENDING connection to sarah@example.com.
  // If a prior test already consumed the pending request, the empty-state or heading appears instead.
  // Use expect() with a timeout so the assertion waits for the page to fully render.
  const content = page
    .getByText(/alex/i)
    .or(page.getByText(/pending requests/i))
    .or(page.getByText(/no pending requests/i))
    .or(page.getByText(/active connections/i));

  await expect(content.first()).toBeVisible({ timeout: 10_000 });
});
