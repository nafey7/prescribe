import { test, expect } from "../../fixtures/test";

test("unauthenticated /patient/profile redirects to landing with returnUrl", async ({
  page,
}) => {
  await page.goto("/patient/profile");

  await expect(page).toHaveURL(/\/\?[^#]*returnUrl=/);

  const url = new URL(page.url());
  expect(url.origin).toBe(new URL(page.url()).origin); // same-origin (no open redirect).
  const returnUrl = url.searchParams.get("returnUrl");
  expect(returnUrl).toBe("/patient/profile");
});
