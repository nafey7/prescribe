import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DoctorPatientsPage extends BasePage {
  async open(): Promise<void> { await this.goto("/doctor/patients"); }

  searchInput() { return this.page.getByRole("searchbox").or(this.page.getByPlaceholder(/search/i)); }
  patientCards() { return this.page.locator('[data-testid="patient-card"]'); }
  patientRows() { return this.page.getByRole("row").filter({ hasText: /@/ }); }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/doctor\/patients/);
  }

  async clickPatient(nameOrEmail: string): Promise<void> {
    await this.page.getByText(nameOrEmail).first().click();
  }
}
