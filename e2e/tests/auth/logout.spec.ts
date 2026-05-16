import { test, expect } from "../../fixtures/patientTest";
import { PatientShellPage } from "../../pages/PatientShellPage";

const ACCESS_TOKEN_KEY = "prescribe_access_token";
const REFRESH_TOKEN_KEY = "prescribe_refresh_token";

test("clicking logout clears session tokens and redirects to landing", async ({
  page,
}) => {
  const shell = new PatientShellPage(page);
  await shell.open();
  await shell.expectAuthenticatedShell();

  // Sanity: storageState seeded the access token before this spec ran.
  const beforeAccess = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    ACCESS_TOKEN_KEY,
  );
  expect(beforeAccess).toBeTruthy();

  await shell.logout();
  await expect(page).toHaveURL(/\/(\?|$)/);

  const afterAccess = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    ACCESS_TOKEN_KEY,
  );
  const afterRefresh = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    REFRESH_TOKEN_KEY,
  );
  expect(afterAccess).toBeFalsy();
  expect(afterRefresh).toBeFalsy();
});
