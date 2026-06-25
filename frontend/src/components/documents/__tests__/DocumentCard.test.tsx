import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
} from "../../../test-utils/renderWithProviders";
import DocumentCard from "../DocumentCard";
import type { DocumentMetadata } from "../../../types/document";

function makeDoc(overrides: Partial<DocumentMetadata> = {}): DocumentMetadata {
  return {
    document_id: "doc-001",
    patient_id: "pat-001",
    filename: "labs.pdf",
    description: "CBC + Metabolic Panel",
    category: "lab_result",
    content_type: "application/pdf",
    file_size_bytes: 12345,
    uploaded_at: "2026-04-15",
    updated_at: "2026-04-15",
    tags: [],
    analysis_status: "completed",
    analyzed_at: "2026-04-15",
    ...overrides,
  };
}

describe("DocumentCard", () => {
  afterEach(cleanup);

  it("renders View and Download buttons for all documents", () => {
    renderWithProviders(
      <DocumentCard
        doc={makeDoc()}
        onView={vi.fn()}
        onDownload={vi.fn()}
      />,
      { router: { initialEntries: ["/"] } }
    );
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("shows Discuss with AI button when onDiscuss is provided", () => {
    const onDiscuss = vi.fn();
    renderWithProviders(
      <DocumentCard
        doc={makeDoc({ category: "lab_result" })}
        onView={vi.fn()}
        onDownload={vi.fn()}
        onDiscuss={onDiscuss}
      />,
      { router: { initialEntries: ["/"] } }
    );
    const btn = screen.getByRole("button", { name: /discuss with ai/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onDiscuss).toHaveBeenCalledOnce();
  });

  it("does not show Discuss with AI button when onDiscuss is not provided", () => {
    renderWithProviders(
      <DocumentCard
        doc={makeDoc({ category: "imaging" })}
        onView={vi.fn()}
        onDownload={vi.fn()}
      />,
      { router: { initialEntries: ["/"] } }
    );
    expect(
      screen.queryByRole("button", { name: /discuss with ai/i })
    ).toBeNull();
  });

  it("opens the durable lab analysis when onAnalyze is provided", () => {
    const onAnalyze = vi.fn();
    renderWithProviders(
      <DocumentCard
        doc={makeDoc()}
        onView={vi.fn()}
        onDownload={vi.fn()}
        onAnalyze={onAnalyze}
      />,
      { router: { initialEntries: ["/"] } }
    );
    screen.getByRole("button", { name: /view ai analysis/i }).click();
    expect(onAnalyze).toHaveBeenCalledOnce();
    expect(screen.getByText(/ai analysis ready/i)).toBeInTheDocument();
  });

  it("shows Delete button when onDelete is provided and not readOnly", () => {
    renderWithProviders(
      <DocumentCard
        doc={makeDoc()}
        onView={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
      { router: { initialEntries: ["/"] } }
    );
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides Delete button when readOnly is true", () => {
    renderWithProviders(
      <DocumentCard
        doc={makeDoc()}
        onView={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        readOnly
      />,
      { router: { initialEntries: ["/"] } }
    );
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });
});
