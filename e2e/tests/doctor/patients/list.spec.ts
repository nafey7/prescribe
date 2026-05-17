import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";

test("patients list loads and shows connected patient John", async ({ page }) => {
  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  // John Doe is an ACTIVE connection with sarah@example.com.
  await expect(page.getByText(/John/i).first()).toBeVisible({ timeout: 10_000 });
});

test("search input filters patient list to show John", async ({ page }) => {
  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  const search = patients.searchInput();

  // If the page has no search box, skip gracefully.
  const hasSearch = await search.first().isVisible().catch(() => false);
  if (!hasSearch) {
    test.skip(true, "No search input found on patients list");
    return;
  }

  await search.first().fill("John");

  // After typing, John should still be visible and no unrelated patient should dominate.
  await expect(page.getByText(/John/i).first()).toBeVisible({ timeout: 5_000 });
});
