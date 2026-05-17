import { test, expect } from "../../../fixtures/doctorTest";
import { buildChatStream } from "../../../mocks/sse";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorChatPage } from "../../../pages/DoctorChatPage";

test("fitness plan tool result is rendered in the doctor chat response", async ({ page }) => {
  const fitnessPlan = {
    num_days: 1,
    days: [
      {
        day_index: 1,
        label: "Day 1",
        is_rest_day: false,
        sessions: [
          {
            session_type: "cardio",
            name: "Walking",
            duration_minutes: 30,
            intensity: "low",
            exercises: [],
            warmup_notes: "",
            cooldown_notes: "",
          },
        ],
      },
    ],
    goal: "Cardiac Rehab Fitness Plan",
    fitness_level: "beginner",
    medical_notes: "",
    summary: "A cardiac rehabilitation fitness plan",
    disclaimer: "",
  };

  await page.route("**/api/doctors/*/patients/*/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "token", content: "Here is a fitness plan:" },
      {
        type: "done",
        chat_id: "c1",
        message_id: "m1",
        message_type: "fitness_plan",
        fitness_plan: fitnessPlan,
      },
    ]);
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  await patients.clickPatient("John");
  await expect(page).toHaveURL(/\/doctor\/patients\/.+/, { timeout: 10_000 });

  const patientId = page.url().split("/doctor/patients/")[1]?.split("/")[0] ?? "";
  expect(patientId).toBeTruthy();

  const chatTab = page.getByRole("tab", { name: /chat/i }).or(page.getByRole("link", { name: /chat/i })).first();
  const chatTabVisible = await chatTab.isVisible().catch(() => false);
  if (chatTabVisible) {
    await chatTab.click();
  } else {
    await page.goto(`/doctor/patients/${patientId}/chat`);
  }

  await expect(page).toHaveURL(/\/doctor\/patients\/.+\/chat/, { timeout: 10_000 });

  const chat = new DoctorChatPage(page);
  await chat.sendMessage("Create a fitness plan for this patient's cardiac rehabilitation.");

  const planContent = page
    .getByText("Cardiac Rehab Fitness Plan")
    .or(page.getByText("Walking"));

  await expect(planContent.first()).toBeVisible({ timeout: 12_000 });
});
