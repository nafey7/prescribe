import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "../../../test-utils/renderWithProviders";
import type { LabReportAnalysis } from "../../../types/document";
import { LabAnalysisResultView } from "../LabAnalysisPanel";

const analysis: LabReportAnalysis = {
  summary: "One result needs attention, one is within range, and one could not be classified.",
  normal_summary: "Potassium is within the range printed on the report.",
  abnormal_summary: "Glucose is above the range printed on the report.",
  next_steps: "Discuss the glucose result and suitable diet and activity changes with a clinician.",
  report_date: "2026-06-20",
  metrics: [
    {
      name: "Glucose",
      value: "145",
      unit: "mg/dL",
      reference_range: "70-99",
      status: "high",
      classification_basis: "report_flag",
      explanation: "The report marks this value high.",
      source_text: "Glucose 145 H mg/dL",
      confidence: "high",
    },
    {
      name: "Potassium",
      value: "4.2",
      unit: "mmol/L",
      reference_range: "3.5-5.1",
      status: "normal",
      classification_basis: "reference_range",
      explanation: "The value is inside the printed range.",
      source_text: "Potassium 4.2 mmol/L",
      confidence: "high",
    },
    {
      name: "Sample quality",
      value: "Hemolyzed",
      unit: "",
      reference_range: "",
      status: "unknown",
      classification_basis: "unknown",
      explanation: "No classification was printed.",
      source_text: "Sample quality hemolyzed",
      confidence: "medium",
    },
  ],
  limitations: ["One metric had no printed reference range."],
  critical_count: 0,
  abnormal_count: 1,
  normal_count: 1,
  unknown_count: 1,
  disclaimer: "This AI summary is educational and is not a diagnosis.",
};

describe("LabAnalysisResultView", () => {
  afterEach(cleanup);

  it("presents normal and abnormal findings as prose with next steps", () => {
    renderWithProviders(<LabAnalysisResultView analysis={analysis} />);

    expect(screen.getByText("Within the report's ranges")).toBeInTheDocument();
    expect(screen.getByText(analysis.normal_summary)).toBeInTheDocument();
    expect(screen.getByText(analysis.abnormal_summary)).toBeInTheDocument();
    expect(screen.getByText("Suggested next steps")).toBeInTheDocument();
    expect(screen.queryByText("Needs attention (1)")).not.toBeInTheDocument();
    expect(screen.getByText(/not a diagnosis/i)).toBeInTheDocument();
  });
});
