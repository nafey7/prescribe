import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export type DoctorNavArea = "dashboard" | "patients" | "connections" | "profile";

const DOCTOR_NAV_TESTIDS: Record<DoctorNavArea, string> = {
  dashboard: "nav-dashboard",
  patients: "nav-patients",
  connections: "nav-connections",
  profile: "nav-profile",
};

export class DoctorShellPage extends BasePage {
  async open(): Promise<void> { await this.goto("/doctor"); }

  navLink(area: DoctorNavArea) { return this.page.getByTestId(DOCTOR_NAV_TESTIDS[area]); }
  async clickNav(area: DoctorNavArea): Promise<void> { await this.navLink(area).click(); }

  logoutButton() { return this.page.getByTestId("doctor-logout"); }

  async expectAuthenticatedShell(): Promise<void> {
    await expect(this.navLink("dashboard")).toBeVisible();
  }

  async expectAtRoot(): Promise<void> {
    await expect(this.page).toHaveURL(/\/doctor(\/|$)/);
  }
}
