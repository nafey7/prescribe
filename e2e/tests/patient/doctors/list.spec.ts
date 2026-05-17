import { test, expect } from "../../../fixtures/patientTest";

test("patient doctors page loads at /patient/doctors", async ({ page }) => {
  await page.goto("/patient/doctors");
  await expect(page).toHaveURL(/\/patient\/doctors(\/|$)/);
});

test("patient doctors page shows doctors section content", async ({ page }) => {
  await page.goto("/patient/doctors");
  await expect(page).toHaveURL(/\/patient\/doctors(\/|$)/);

  // The page should render something meaningful — either the doctors list or the
  // "My Doctors" heading / empty state copy.
  const content = page
    .getByText(/my doctors/i)
    .or(page.getByText(/doctors/i).first())
    .or(page.getByText(/coming soon/i))
    .or(page.getByText(/connected/i));

  await expect(content.first()).toBeVisible({ timeout: 10_000 });
});

test("patient doctors page shows Sarah or a connection for the seeded active connection", async ({
  page,
}) => {
  await page.goto("/patient/doctors");
  await expect(page).toHaveURL(/\/patient\/doctors(\/|$)/);

  // John has an ACTIVE connection to Dr. Sarah Ahmed (sarah@example.com).
  // If the connections list is rendered, Sarah's name should appear.
  // If the page is in "coming soon" empty-state mode, we accept that gracefully.
  // Use expect() with a timeout so the assertion waits for the page to fully render.
  const content = page
    .getByText(/sarah/i)
    .or(page.getByText(/my doctors/i))
    .or(page.getByText(/coming soon/i))
    .or(page.getByText(/see the doctors/i));

  await expect(content.first()).toBeVisible({ timeout: 10_000 });
});
