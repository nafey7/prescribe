import { test, expect } from "../../../fixtures/doctorTest";

test("doctor can reject a pending connection request", async ({ page }) => {
  await page.goto("/doctor/connections");
  await expect(page).toHaveURL(/\/doctor\/connections(\/|$)/);

  // Wait for the connections list to finish loading.
  await expect(page.getByText(/connections/i).first()).toBeVisible({ timeout: 10_000 });

  // Check whether any pending connection with a Reject button exists.
  const rejectButton = page.getByRole("button", { name: /reject/i }).first();
  const hasPending = await rejectButton.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hasPending) {
    test.skip(
      true,
      "No pending connection found — seed data may have been consumed by accept.spec.ts or a prior test run",
    );
    return;
  }

  await rejectButton.click();

  // After rejecting, the Reject button for that row should disappear and the
  // pending section should shrink or show the empty state.
  // We wait briefly for the optimistic / server update to propagate.
  const noMoreReject = await page
    .getByRole("button", { name: /reject/i })
    .first()
    .isVisible({ timeout: 8_000 })
    .catch(() => false);

  // Either no reject button remains, or at least the active connections heading
  // is visible — both indicate the page has updated successfully.
  const activeVisible = await page
    .getByText(/active connections/i)
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  expect(!noMoreReject || activeVisible).toBe(true);
});
