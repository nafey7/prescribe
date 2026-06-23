import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithTheme, screen } from "../test-utils/renderWithProviders";
import { Markdown } from "./Markdown";

describe("Markdown citations", () => {
  afterEach(cleanup);

  it("renders a resolved citation as a source button", () => {
    const onCitationClick = vi.fn();
    const source = {
      source_id: "profile-medications",
      source_type: "profile_field" as const,
      title: "Current medications",
      detail: "Patient profile",
      profile_field: "medications",
    };

    renderWithTheme(
      <Markdown citations={[source]} onCitationClick={onCitationClick}>
        {"Takes metformin [Profile · Medications](#citation-profile-medications)."}
      </Markdown>
    );

    fireEvent.click(screen.getByRole("button", { name: "Profile · Medications" }));
    expect(onCitationClick).toHaveBeenCalledWith(source);
  });

  it("keeps an unresolved streaming citation disabled", () => {
    renderWithTheme(
      <Markdown>{"Result [Lab report](#citation-document-doc-1)."}</Markdown>
    );
    expect(screen.getByRole("button", { name: "Lab report" })).toBeDisabled();
  });
});
