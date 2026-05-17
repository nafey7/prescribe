import { test, expect } from "../../../fixtures/patientTest";
import { PatientDocumentsPage } from "../../../pages/PatientDocumentsPage";
import { fetchFeatureFlags } from "../../../utils/featureFlags";

test("AI suggestions panel shows mocked suggestions when feature is enabled", async ({
  page,
  request,
}) => {
  const flags = await fetchFeatureFlags(request);
  test.skip(!flags.AI_SUGGESTIONS_ENABLED, "AI suggestions disabled");

  // Mock the suggestions API before navigating to the page.
  await page.route("**/api/patients/*/suggestions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "s1", text: "Take medication with food", category: "medication" },
        { id: "s2", text: "Schedule follow-up in 2 weeks", category: "followup" },
      ]),
    });
  });

  const docs = new PatientDocumentsPage(page);
  await docs.open();
  await docs.expectLoaded();

  // The suggestions panel should be present.
  await expect(docs.suggestionsPanel()).toBeVisible();

  // At least one of the mocked suggestion texts should appear.
  await expect(page.getByText("Take medication with food")).toBeVisible();
});
