import { test, expect } from "../../fixtures/patientTest";

const LEGACY_REDIRECT_CASES: Array<{ from: string; to: RegExp }> = [
  { from: "/home", to: /\/patient(\/|$)/ },
  { from: "/profile", to: /\/patient\/profile(\/|$)/ },
  { from: "/documents", to: /\/patient\/documents(\/|$)/ },
  { from: "/dashboard", to: /\/patient(\/|$)/ },
  { from: "/public/chat", to: /\/patient\/chat(\/|$)/ },
];

for (const { from, to } of LEGACY_REDIRECT_CASES) {
  test(`legacy route "${from}" redirects to the correct patient path`, async ({ page }) => {
    await page.goto(from);

    // React Router's <Navigate replace> fires synchronously on render.
    // We wait for the URL to change to the expected destination.
    await expect(page).toHaveURL(to, { timeout: 10_000 });

    // Confirm the final URL is NOT the legacy path anymore.
    await expect(page).not.toHaveURL(new RegExp(`^${from.replace("/", "\\/")}(\\?|#|$)`));
  });
}
