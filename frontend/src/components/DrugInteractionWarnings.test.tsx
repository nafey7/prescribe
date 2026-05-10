import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DrugInteraction } from "../types/doctor";
import DrugInteractionWarnings from "./DrugInteractionWarnings";

const criticalInteraction: DrugInteraction = {
  severity: "critical",
  title: "Warfarin + Aspirin — bleeding risk",
  description: "Concurrent use significantly increases bleeding risk.",
  implicated_drugs: ["Warfarin", "Aspirin"],
};

const moderateInteraction: DrugInteraction = {
  severity: "moderate",
  title: "Aspirin + Lisinopril interaction",
  description: "NSAIDs can reduce ACE inhibitor effectiveness.",
  implicated_drugs: ["Aspirin", "Lisinopril"],
};

const minorInteraction: DrugInteraction = {
  severity: "minor",
  title: "Minor interaction example",
  description: "Minor risk; monitor as needed.",
  implicated_drugs: ["DrugA", "DrugB"],
};

describe("DrugInteractionWarnings", () => {
  it("renders nothing when interactions list is empty", () => {
    const { container } = render(<DrugInteractionWarnings interactions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the disclaimer alert when there are interactions", () => {
    const { getByText } = render(
      <DrugInteractionWarnings interactions={[criticalInteraction]} />
    );
    expect(getByText(/AI-generated, verify clinically/i)).toBeInTheDocument();
  });

  it("renders the correct number of interaction cards", () => {
    const { container } = render(
      <DrugInteractionWarnings
        interactions={[criticalInteraction, moderateInteraction, minorInteraction]}
      />
    );
    expect(container.textContent).toContain(criticalInteraction.title);
    expect(container.textContent).toContain(moderateInteraction.title);
    expect(container.textContent).toContain(minorInteraction.title);
  });

  it("renders a critical chip for critical interactions", () => {
    const { getAllByText } = render(
      <DrugInteractionWarnings interactions={[criticalInteraction]} />
    );
    expect(getAllByText("critical").length).toBeGreaterThan(0);
  });

  it("renders a moderate chip for moderate interactions", () => {
    const { getAllByText } = render(
      <DrugInteractionWarnings interactions={[moderateInteraction]} />
    );
    expect(getAllByText("moderate").length).toBeGreaterThan(0);
  });

  it("renders a minor chip for minor interactions", () => {
    const { getAllByText } = render(
      <DrugInteractionWarnings interactions={[minorInteraction]} />
    );
    expect(getAllByText("minor").length).toBeGreaterThan(0);
  });

  it("lists implicated drugs for each interaction", () => {
    const { container } = render(
      <DrugInteractionWarnings interactions={[criticalInteraction]} />
    );
    expect(container.textContent).toContain("Warfarin, Aspirin");
  });
});
