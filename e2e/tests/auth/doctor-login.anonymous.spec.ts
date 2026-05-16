import { test, DOCTOR_USER } from "../../fixtures/test";
import { DoctorShellPage } from "../../pages/DoctorShellPage";
import { LandingPage } from "../../pages/LandingPage";

test("doctor logs in via the UI and lands on /doctor", async ({ page }) => {
  const landing = new LandingPage(page);
  await landing.openLogin();
  await landing.loginAs(DOCTOR_USER.email, DOCTOR_USER.password);

  const shell = new DoctorShellPage(page);
  await shell.expectAtRoot();
});
