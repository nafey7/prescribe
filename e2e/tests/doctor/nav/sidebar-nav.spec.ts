import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorShellPage, type DoctorNavArea } from "../../../pages/DoctorShellPage";

const NAV_CASES: Array<{ area: DoctorNavArea; pathRegex: RegExp; end?: boolean }> = [
  { area: "dashboard", pathRegex: /\/doctor(\/|$)/, end: true },
  { area: "patients", pathRegex: /\/doctor\/patients(\/|$)/ },
  { area: "connections", pathRegex: /\/doctor\/connections(\/|$)/ },
  { area: "profile", pathRegex: /\/doctor\/profile(\/|$)/ },
];

test("all doctor nav links are visible on the sidebar", async ({ page }) => {
  const shell = new DoctorShellPage(page);
  await shell.open();
  await shell.expectAuthenticatedShell();

  await expect(shell.navLink("dashboard")).toBeVisible();
  await expect(shell.navLink("patients")).toBeVisible();
  await expect(shell.navLink("connections")).toBeVisible();
  await expect(shell.navLink("profile")).toBeVisible();
});

for (const { area, pathRegex } of NAV_CASES) {
  test(`clicking nav "${area}" navigates to the correct route`, async ({ page }) => {
    const shell = new DoctorShellPage(page);
    await shell.open();
    await shell.expectAuthenticatedShell();

    await shell.clickNav(area);
    await expect(page).toHaveURL(pathRegex);

    // Sidebar persists after navigation — the clicked link is still visible.
    await expect(shell.navLink(area)).toBeVisible();
  });
}
