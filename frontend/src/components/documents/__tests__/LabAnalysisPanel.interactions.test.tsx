import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "../../../test-utils/renderWithProviders";
import type { LabAnalysisResponse } from "../../../types/document";
import LabAnalysisPanel from "../LabAnalysisPanel";

const hooks = vi.hoisted(() => ({
  data: undefined as unknown,
  retry: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../../../api/documentsApi", () => ({
  useGetLabAnalysisQuery: () => ({
    data: hooks.data,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: hooks.refetch,
  }),
  useRetryLabAnalysisMutation: () => [hooks.retry, { isLoading: false }],
}));

const response: LabAnalysisResponse = {
  document_id: "lab-1",
  status: "completed",
  error: null,
  analyzed_at: "2026-06-25T00:00:00Z",
  analysis: {
    summary: "One metric was extracted.",
    normal_summary: "No results were identified as normal.",
    abnormal_summary: "No results were identified as abnormal.",
    next_steps: "Review the original report with a clinician.",
    report_date: "2026-06-21",
    metrics: [],
    limitations: [],
    critical_count: 0,
    abnormal_count: 0,
    normal_count: 0,
    unknown_count: 0,
    disclaimer: "Educational only; not a diagnosis.",
  },
};

describe("LabAnalysisPanel interactions", () => {
  beforeEach(() => {
    hooks.data = response;
    hooks.retry.mockReset();
    hooks.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("allows a completed report to be analyzed again", () => {
    renderWithProviders(
      <LabAnalysisPanel patientId="patient-1" documentId="lab-1" />
    );

    screen.getByRole("button", { name: /re-analyze report/i }).click();

    expect(hooks.retry).toHaveBeenCalledWith({
      patientId: "patient-1",
      documentId: "lab-1",
    });
  });

  it("keeps polling while repeated responses remain processing", () => {
    vi.useFakeTimers();
    hooks.data = {
      document_id: "lab-1",
      status: "processing",
      analysis: null,
      error: null,
      analyzed_at: null,
    } satisfies LabAnalysisResponse;

    renderWithProviders(
      <LabAnalysisPanel patientId="patient-1" documentId="lab-1" />
    );

    act(() => vi.advanceTimersByTime(6_100));

    expect(hooks.refetch).toHaveBeenCalledTimes(3);
  });
});
