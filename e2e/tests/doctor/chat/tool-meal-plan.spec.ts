import { test, expect } from "../../../fixtures/doctorTest";
import { buildChatStream } from "../../../mocks/sse";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorChatPage } from "../../../pages/DoctorChatPage";

test("meal plan tool result is rendered in the doctor chat response", async ({ page }) => {
  const mealPlan = {
    num_days: 1,
    days: [
      {
        day_index: 1,
        label: "Monday",
        meals: [
          {
            name: "Oatmeal",
            description: "Heart-healthy oatmeal breakfast",
            items: ["Rolled oats", "Berries"],
          },
        ],
      },
    ],
    summary: "Heart-Healthy Meal Plan",
    disclaimer: "",
  };

  await page.route("**/api/doctors/*/patients/*/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "token", content: "Here is your meal plan:" },
      {
        type: "done",
        chat_id: "c1",
        message_id: "m1",
        message_type: "meal_plan",
        meal_plan: mealPlan,
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
  await chat.sendMessage("Can you create a meal plan for this patient?");

  const planContent = page
    .getByText("Heart-Healthy Meal Plan")
    .or(page.getByText("Monday"))
    .or(page.getByText("Oatmeal"));

  await expect(planContent.first()).toBeVisible({ timeout: 12_000 });
});
