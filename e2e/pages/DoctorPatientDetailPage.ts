import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DoctorPatientDetailPage extends BasePage {
  // Profile tab content
  profileSection() { return this.page.getByText(/date of birth|dob|demographics/i).first(); }

  // Documents tab
  documentsTab() { return this.page.getByRole("tab", { name: /documents/i }); }
  profileTab() { return this.page.getByRole("tab", { name: /profile|overview/i }).first(); }

  // Upload/delete controls should NOT be present on doctor's view
  uploadButton() { return this.page.getByRole("button", { name: /upload/i }); }
  deleteButton() { return this.page.getByRole("button", { name: /delete/i }); }

  async expectLoaded(patientId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/doctor/patients/${patientId}`));
  }

  async clickDocumentsTab(): Promise<void> { await this.documentsTab().click(); }
}
