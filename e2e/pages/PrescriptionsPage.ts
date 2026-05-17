import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class PrescriptionsPage extends BasePage {
  createButton() { return this.page.getByRole("button", { name: /new prescription|create prescription|add prescription/i }); }
  prescriptionRows() { return this.page.locator('[data-testid="prescription-row"]').or(this.page.getByRole("row").filter({ hasText: /active|pending|completed|suspended/i })); }
  statusFilter() { return this.page.getByLabel(/status/i).or(this.page.getByRole("combobox", { name: /status/i })); }

  // Create form
  diagnosisInput() { return this.page.getByLabel(/diagnosis/i); }
  medicationInput() { return this.page.getByLabel("Name").first(); }

  // Drug interaction checker
  drugInteractionButton() { return this.page.getByRole("button", { name: /check interactions/i }); }
  interactionWarning() { return this.page.getByTestId("drug-interaction-warning").or(this.page.getByText(/interaction/i)); }

  // AI suggestions
  aiSuggestionsButton() { return this.page.getByRole("button", { name: /ai copilot/i }); }
  suggestionsModal() { return this.page.getByRole("dialog"); }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/prescriptions/);
  }
}
