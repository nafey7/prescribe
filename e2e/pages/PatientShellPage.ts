import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export type PatientNavArea =
  | "dashboard"
  | "profile"
  | "documents"
  | "doctors"
  | "meal-plans"
  | "fitness-plans";

const NAV_TESTIDS: Record<PatientNavArea, string> = {
  dashboard: "nav-dashboard",
  profile: "nav-profile",
  documents: "nav-documents",
  doctors: "nav-doctors",
  "meal-plans": "nav-meal-plans",
  "fitness-plans": "nav-fitness-plans",
};

/**
 * Authenticated patient portal shell (sidebar + header + outlet). POM stays
 * thin — selectors and a couple of imperative actions only.
 */
export class PatientShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto("/patient");
  }

  navLink(area: PatientNavArea) {
    return this.page.getByTestId(NAV_TESTIDS[area]);
  }

  async clickNav(area: PatientNavArea): Promise<void> {
    await this.navLink(area).click();
  }

  logoutButton() {
    return this.page.getByRole("button", { name: /log out/i });
  }

  async logout(): Promise<void> {
    await this.logoutButton().click();
  }

  async expectAuthenticatedShell(): Promise<void> {
    // Sidebar nav is the canonical signal that we're inside the shell. We
    // assert on a stable testid rather than role+name so a copy change does
    // not break us.
    await expect(this.navLink("dashboard")).toBeVisible();
  }
}
