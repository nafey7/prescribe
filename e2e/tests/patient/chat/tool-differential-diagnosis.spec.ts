import { test, expect } from "../../../fixtures/patientTest";
import { buildChatStream } from "../../../mocks/sse";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("differential diagnosis result is rendered in the chat response", async ({ page }) => {
  const diagPayload = {
    summary: "Based on your symptoms, several conditions are possible.",
    diagnoses: [
      {
        rank: 1,
        condition: "Hypertension",
        probability: 85,
        tier: "high",
        rationale: "Based on reported symptoms",
        supporting_evidence: ["Elevated heart rate", "Headache"],
        contradicting_evidence: [],
        key_workup: ["Blood pressure measurement"],
      },
      {
        rank: 2,
        condition: "Anxiety",
        probability: 45,
        tier: "moderate",
        rationale: "Secondary consideration",
        supporting_evidence: ["Racing heart"],
        contradicting_evidence: [],
        key_workup: ["Mental health screening"],
      },
    ],
    red_flags: [],
    recommended_workup: ["Blood pressure check", "ECG"],
    reasoning_notes: "Patient presents with cardiovascular symptoms.",
    disclaimer: "This is not a medical diagnosis.",
  };

  await page.route("**/api/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "token", content: "Based on your symptoms:" },
      {
        type: "done",
        chat_id: "c1",
        message_id: "m1",
        message_type: "differential_diagnosis",
        differential_diagnosis: diagPayload,
      },
    ]);
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  const chat = new PatientChatPage(page);
  await chat.open();
  await chat.expectLoaded();

  await chat.sendMessage("I have a headache and my heart is racing, what could it be?");

  await expect(page.getByText("Hypertension")).toBeVisible({ timeout: 10_000 });

  const recommendation = page
    .getByText(/based on your symptoms/i)
    .or(page.getByText("Hypertension"));
  await expect(recommendation.first()).toBeVisible({ timeout: 10_000 });
});
