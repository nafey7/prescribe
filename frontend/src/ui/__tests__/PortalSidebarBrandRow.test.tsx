import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithTheme, screen } from "../../test-utils/renderWithProviders";
import { PortalSidebarBrandRow } from "../PortalSidebarBrandRow";

describe("PortalSidebarBrandRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title, subtitle, and trailing slot", () => {
    renderWithTheme(
      <PortalSidebarBrandRow
        accent="primary"
        title="Test portal"
        subtitle="Test subtitle"
        trailing={<button type="button">Toggle</button>}
      />
    );

    expect(screen.getByText("Test portal")).toBeInTheDocument();
    expect(screen.getByText("Test subtitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle" })).toBeInTheDocument();
  });

  it("uses a 56px-tall brand row container", () => {
    const { container } = renderWithTheme(
      <PortalSidebarBrandRow accent="secondary" title="A" subtitle="B" />
    );

    const row = container.firstElementChild as HTMLElement;
    expect(row).toBeTruthy();
    expect(window.getComputedStyle(row).height).toBe("56px");
  });

  it("omits subtitle when not provided", () => {
    const { container } = renderWithTheme(
      <PortalSidebarBrandRow accent="secondary" title="Doctor portal" />
    );

    expect(screen.getByText("Doctor portal")).toBeInTheDocument();
    expect(container.querySelectorAll(".MuiTypography-caption")).toHaveLength(0);
  });
});
