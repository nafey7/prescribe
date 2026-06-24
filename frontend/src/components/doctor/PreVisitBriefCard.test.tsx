import { describe, expect, it } from "vitest";
import { renderWithTheme, screen, within } from "../../test-utils/renderWithProviders";
import type { PreVisitBrief } from "../../types/doctor";
import PreVisitBriefCard from "./PreVisitBriefCard";

const brief: PreVisitBrief = {
  summary: "A new CBC and medication order need review.",
  recent_documents: ["CBC uploaded June 20 reports mild anemia."],
  medication_changes: ["Lisinopril 10 mg daily was issued June 18."],
  abnormal_labs: ["Hemoglobin 10.8 g/dL is marked low."],
  unresolved_concerns: ["The anemia finding is pending review."],
  generated_at: "2026-06-24T12:00:00Z",
  lookback_days: 180,
  evidence: {
    document_count: 1,
    prescription_count: 1,
    finding_count: 1,
    pending_finding_count: 1,
  },
};

describe("PreVisitBriefCard", () => {
  it("renders summary, evidence counts, and all four sections", () => {
    renderWithTheme(<PreVisitBriefCard brief={brief} />);

    expect(screen.getByText(brief.summary)).toBeInTheDocument();
    expect(screen.getByText("1 document")).toBeInTheDocument();
    expect(screen.getByText("1 prescription")).toBeInTheDocument();
    expect(screen.getByText("1 pending finding")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Abnormal labs" })).getByText(
        "Hemoglobin 10.8 g/dL is marked low."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/verify important details in the source documents/i)
    ).toBeInTheDocument();
  });

  it("renders explicit empty states instead of hiding sections", () => {
    renderWithTheme(
      <PreVisitBriefCard
        brief={{
          ...brief,
          recent_documents: [],
          medication_changes: [],
          abnormal_labs: [],
          unresolved_concerns: [],
        }}
      />
    );

    expect(
      screen.getByText("No explicitly abnormal recent lab results identified.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No explicit unresolved concerns identified.")
    ).toBeInTheDocument();
  });
});
