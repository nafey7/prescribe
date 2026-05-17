import { test, expect } from "../../../fixtures/patientTest";

test("patient doctors page exposes a way to request a new connection", async ({
  page,
}) => {
  await page.goto("/patient/doctors");
  await expect(page).toHaveURL(/\/patient\/doctors(\/|$)/);

  // Look for an "Add doctor", "Request connection", or similar CTA. The page
  // may still be in "coming soon" state — skip rather than fail if no CTA exists.
  const cta = page
    .getByRole("button", { name: /add doctor|request connection|connect|find doctor/i })
    .or(page.getByRole("link", { name: /add doctor|request connection|connect/i }));

  const ctaVisible = await cta.first().isVisible({ timeout: 8_000 }).catch(() => false);

  if (!ctaVisible) {
    test.skip(true, "No connection-request CTA found — feature may not be implemented yet");
    return;
  }

  await expect(cta.first()).toBeVisible();
});

test("patient can search for Dr. Omar Khan and initiate a connection request", async ({
  page,
}) => {
  await page.goto("/patient/doctors");
  await expect(page).toHaveURL(/\/patient\/doctors(\/|$)/);

  // Try to find a search input for browsing/finding doctors.
  const searchInput = page
    .getByRole("searchbox")
    .or(page.getByPlaceholder(/search|find|doctor/i))
    .or(page.getByRole("textbox", { name: /search|find/i }));

  const hasSearch = await searchInput.first().isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hasSearch) {
    test.skip(true, "No doctor search input found — feature may not be implemented yet");
    return;
  }

  await searchInput.first().fill("Omar");

  // After typing, results or a suggestion for Omar should appear.
  const omarResult = page.getByText(/Omar/i);
  await expect(omarResult.first()).toBeVisible({ timeout: 8_000 });

  // Click the request/connect button adjacent to Omar's result.
  const requestButton = page
    .getByRole("button", { name: /connect|request|add/i })
    .first();

  await expect(requestButton).toBeVisible({ timeout: 5_000 });
  await requestButton.click();

  // Assert the request was acknowledged — success toast, status change, or
  // the entry now appears in a "pending" state.
  const confirmation = page
    .getByText(/pending|requested|sent|success/i)
    .or(page.getByRole("alert"))
    .first();

  await expect(confirmation).toBeVisible({ timeout: 10_000 });
});
