import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "../../../test-utils/renderWithProviders";
import type { DocumentMetadata } from "../../../types/document";
import DocumentPreview from "../DocumentPreview";

const api = vi.hoisted(() => ({
  fetchDocumentBlob: vi.fn(),
}));

vi.mock("../../../api/documents", () => ({
  fetchDocumentBlob: api.fetchDocumentBlob,
}));

const doc: DocumentMetadata = {
  document_id: "doc-1",
  patient_id: "patient-1",
  filename: "labs.pdf",
  content_type: "application/pdf",
  file_size_bytes: 100,
  category: "lab_result",
  description: "Labs",
  tags: [],
  uploaded_at: "2026-06-25T00:00:00Z",
  updated_at: "2026-06-25T00:00:00Z",
  analysis_status: "completed",
  analyzed_at: "2026-06-25T00:00:00Z",
};

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("DocumentPreview", () => {
  beforeEach(() => {
    api.fetchDocumentBlob.mockReset();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:authenticated-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  });

  it("loads a patient document through the authenticated blob client", async () => {
    api.fetchDocumentBlob.mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" })
    );

    renderWithProviders(
      <DocumentPreview patientId="patient-1" doc={doc} onClose={vi.fn()} />
    );

    expect(screen.getByText("Loading document…")).toBeInTheDocument();
    const frame = await screen.findByTitle("labs.pdf");
    expect(frame).toHaveAttribute("src", "blob:authenticated-preview");
    expect(api.fetchDocumentBlob).toHaveBeenCalledWith("patient-1", "doc-1");
  });

  it("shows a readable error instead of embedding an unauthenticated response", async () => {
    api.fetchDocumentBlob.mockRejectedValue(new Error("Authentication required"));

    renderWithProviders(
      <DocumentPreview patientId="patient-1" doc={doc} onClose={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Authentication required")
    );
    expect(screen.queryByTitle("labs.pdf")).not.toBeInTheDocument();
  });

  it("uses the connected-doctor authenticated loader when supplied", async () => {
    const fetchBlobOverride = vi.fn().mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" })
    );

    renderWithProviders(
      <DocumentPreview
        patientId="patient-1"
        doc={doc}
        onClose={vi.fn()}
        fetchBlobOverride={fetchBlobOverride}
      />
    );

    await screen.findByTitle("labs.pdf");
    expect(fetchBlobOverride).toHaveBeenCalledOnce();
    expect(api.fetchDocumentBlob).not.toHaveBeenCalled();
  });
});
