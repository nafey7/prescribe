import { test, expect, PATIENT_USER } from "../../fixtures/test";
import { LandingPage } from "../../pages/LandingPage";

test("wrong password surfaces an error and does not navigate", async ({
  page,
}) => {
  const landing = new LandingPage(page);
  await landing.openLogin();
  await landing.loginAs(PATIENT_USER.email, "definitely-not-the-password");

  await landing.expectLoginError();

  // URL did not advance to a portal namespace.
  await expect(page).not.toHaveURL(/\/patient(\/|$)/);
  await expect(page).not.toHaveURL(/\/doctor(\/|$)/);
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
