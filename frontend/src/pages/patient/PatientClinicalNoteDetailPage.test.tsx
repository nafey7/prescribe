import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import PatientClinicalNoteDetailPage from "./PatientClinicalNoteDetailPage";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("../../contexts/PatientContext", () => ({
  usePatientContext: () => ({ currentPatientId: "patient-1" }),
}));

vi.mock("../../api/patientsApi", () => ({
  useGetPatientClinicalNoteQuery: () => ({
    data: {
      note_id: "note-1",
      patient_id: "patient-1",
      doctor_id: "doctor-1",
      doctor_display_name: "Dr. Sam Lee",
      note_type: "after_visit_summary",
      title: "Visit summary",
      content: "## Plan\nContinue inhaler.",
      encounter_date: "2026-06-24",
      published_at: "2026-06-24T10:00:00Z",
      updated_at: "2026-06-24T10:00:00Z",
      correction_request: null,
    },
    isLoading: false,
    error: undefined,
  }),
  useRequestClinicalNoteCorrectionMutation: () => [mocks.request, { isLoading: false }],
}));

describe("PatientClinicalNoteDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.request.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("shows the shared note and sends a specific correction request", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/patient/clinical-notes/:noteId" element={<PatientClinicalNoteDetailPage />} />
      </Routes>,
      { router: { initialEntries: ["/patient/clinical-notes/note-1"] } }
    );

    expect(screen.getByRole("heading", { name: "Visit summary" })).toBeInTheDocument();
    expect(screen.getByText("Continue inhaler.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Flag for correction" }));
    fireEvent.change(screen.getByLabelText("What should be corrected?"), {
      target: { value: "The inhaler dose is listed incorrectly." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send correction request" }));

    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith({
      patientId: "patient-1",
      noteId: "note-1",
      comment: "The inhaler dose is listed incorrectly.",
    }));
  });
});
