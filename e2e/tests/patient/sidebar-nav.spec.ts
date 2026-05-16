import { test, expect } from "../../fixtures/patientTest";
import {
  PatientShellPage,
  type PatientNavArea,
} from "../../pages/PatientShellPage";

const NAV_CASES: Array<{ area: PatientNavArea; pathRegex: RegExp }> = [
  { area: "profile", pathRegex: /\/patient\/profile(\/|$)/ },
  { area: "documents", pathRegex: /\/patient\/documents(\/|$)/ },
  { area: "doctors", pathRegex: /\/patient\/doctors(\/|$)/ },
  { area: "meal-plans", pathRegex: /\/patient\/meal-plans(\/|$)/ },
  { area: "fitness-plans", pathRegex: /\/patient\/fitness-plans(\/|$)/ },
];

test("patient sidebar nav routes to each section", async ({ page }) => {
  const shell = new PatientShellPage(page);
  await shell.open();
  await shell.expectAuthenticatedShell();

  for (const { area, pathRegex } of NAV_CASES) {
    await shell.clickNav(area);
    await expect(page).toHaveURL(pathRegex);
    // Sidebar should remain visible after each navigation (the layout
    // persists; only the outlet swaps).
    await expect(shell.navLink(area)).toBeVisible();
  }
});
