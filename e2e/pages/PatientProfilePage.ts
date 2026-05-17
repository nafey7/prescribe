import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class PatientProfilePage extends BasePage {
  async open(): Promise<void> { await this.goto("/patient/profile"); }

  // Form section headings
  demographicsSection() { return this.page.getByRole("heading", { name: /demographics/i }); }

  // The edit button (Pencil icon button)
  editButton() { return this.page.getByRole("button", { name: /edit/i }); }
  saveButton() { return this.page.getByRole("button", { name: /save/i }); }
  cancelButton() { return this.page.getByRole("button", { name: /cancel/i }); }

  // Profile data: first name field (input with label "First name")
  firstNameInput() { return this.page.getByLabel(/first name/i); }
  lastNameInput() { return this.page.getByLabel(/last name/i); }
  emailInput() { return this.page.getByLabel(/email/i); }

  async expectProfileLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/patient\/profile/);
    await expect(this.demographicsSection()).toBeVisible();
  }

  async clickEdit(): Promise<void> { await this.editButton().click(); }
  async clickSave(): Promise<void> { await this.saveButton().click(); }
}
