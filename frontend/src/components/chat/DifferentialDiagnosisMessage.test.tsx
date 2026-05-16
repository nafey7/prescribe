import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DifferentialDiagnosisPayload } from "../../types/differentialDiagnosis";
import { DifferentialDiagnosisMessage } from "./DifferentialDiagnosisMessage";

afterEach(() => {
  cleanup();
});

function makePayload(
  overrides: Partial<DifferentialDiagnosisPayload> = {}
): DifferentialDiagnosisPayload {
  return {
    summary: "47yo with diabetes and exertional chest pressure.",
    diagnoses: [
      {
        rank: 1,
        condition: "Acute coronary syndrome",
        probability: 45,
        tier: "high",
        rationale: "Classic exertional chest pressure with diaphoresis.",
        supporting_evidence: ["Type 2 diabetes", "Father with HTN"],
        contradicting_evidence: [],
        key_workup: ["12-lead ECG", "Serial troponins"],
      },
      {
        rank: 2,
        condition: "GERD",
        probability: 20,
        tier: "moderate",
        rationale: "Could mimic anginal pain.",
        supporting_evidence: ["History of reflux"],
        contradicting_evidence: ["Exertional trigger atypical for GERD"],
        key_workup: ["Trial of PPI"],
      },
    ],
    red_flags: ["ACS — obtain ECG and troponins immediately"],
    recommended_workup: ["12-lead ECG", "Troponin", "CXR"],
    reasoning_notes: "Diabetes raises cardiac risk substantially.",
    disclaimer: "Educational prototype. Verify clinically.",
    ...overrides,
  };
}

describe("DifferentialDiagnosisMessage", () => {
  it("renders summary, all diagnoses, red flags, workup, and disclaimer", () => {
    render(<DifferentialDiagnosisMessage payload={makePayload()} />);
    expect(
      screen.getByText(/47yo with diabetes and exertional chest pressure\./i)
    ).toBeInTheDocument();
    expect(screen.getByText("Acute coronary syndrome")).toBeInTheDocument();
    expect(screen.getByText("GERD")).toBeInTheDocument();
    expect(
      screen.getByText(/ACS — obtain ECG and troponins immediately/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Recommended initial workup")).toBeInTheDocument();
    expect(screen.getByText(/Educational prototype/i)).toBeInTheDocument();
  });

  it("renders a probability chip for each diagnosis", () => {
    render(<DifferentialDiagnosisMessage payload={makePayload()} />);
    // MUI Tooltip wraps the Chip in a clone, so the probability label may appear twice.
    expect(screen.getAllByText("45%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("20%").length).toBeGreaterThan(0);
  });

  it("renders a determinate progress bar with the correct value per diagnosis", () => {
    render(<DifferentialDiagnosisMessage payload={makePayload()} />);
    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBe(2);
    expect(bars[0]).toHaveAttribute("aria-valuenow", "45");
    expect(bars[1]).toHaveAttribute("aria-valuenow", "20");
  });

  it("does not render the red-flags section when red_flags is empty", () => {
    render(
      <DifferentialDiagnosisMessage payload={makePayload({ red_flags: [] })} />
    );
    expect(
      screen.queryByText(/Red flags — rule out regardless of probability/i)
    ).not.toBeInTheDocument();
  });

  it("does not render reasoning section when reasoning_notes is empty", () => {
    render(
      <DifferentialDiagnosisMessage
        payload={makePayload({ reasoning_notes: "" })}
      />
    );
    expect(screen.queryByText("Reasoning")).not.toBeInTheDocument();
  });

  it("renders supporting evidence inside the first diagnosis row (expanded by default)", () => {
    render(<DifferentialDiagnosisMessage payload={makePayload()} />);
    // The first diagnosis is expanded by default; its supporting_evidence should be visible.
    expect(screen.getByText("Type 2 diabetes")).toBeInTheDocument();
    expect(screen.getByText("Father with HTN")).toBeInTheDocument();
  });

  it("expands the second diagnosis when its accordion summary is clicked", () => {
    render(<DifferentialDiagnosisMessage payload={makePayload()} />);
    // The History of reflux item belongs to the second (collapsed-by-default) diagnosis.
    // Click on the GERD row to expand it.
    fireEvent.click(screen.getByText("GERD"));
    expect(screen.getByText("History of reflux")).toBeInTheDocument();
  });

  it("renders the 'Verify clinically' badge in the header", () => {
    render(<DifferentialDiagnosisMessage payload={makePayload()} />);
    // Tooltip wraps the chip in a clone, so the label may appear more than once.
    const matches = screen.getAllByText("Verify clinically");
    expect(matches.length).toBeGreaterThan(0);
    // Sanity check: the badge sits inside the header row alongside the title.
    expect(
      within(matches[0].closest("div, span") as HTMLElement).getByText(
        "Verify clinically"
      )
    ).toBeInTheDocument();
  });
});
