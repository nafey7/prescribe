import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import ClinicalNoteEditorDialog from "./ClinicalNoteEditorDialog";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  publish: vi.fn(),
  revise: vi.fn(),
}));

vi.mock("../../api/doctorsApi", () => ({
  useGenerateClinicalNoteDraftMutation: () => [mocks.generate, { isLoading: false }],
  usePublishClinicalNoteMutation: () => [mocks.publish, { isLoading: false }],
  useReviseClinicalNoteMutation: () => [mocks.revise, { isLoading: false }],
}));

describe("ClinicalNoteEditorDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generate.mockReturnValue({
      unwrap: () => Promise.resolve({ title: "Asthma follow-up", content: "## Plan\nContinue inhaler." }),
    });
    mocks.publish.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("generates an editable brief and requires explicit publish", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ClinicalNoteEditorDialog
        open
        doctorId="doctor-1"
        patientId="patient-1"
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByLabelText("Clinician encounter context"), {
      target: { value: "Reviewed inhaler technique." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate brief" }));

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Asthma follow-up"));
    expect(screen.getByLabelText("Content")).toHaveValue("## Plan\nContinue inhaler.");
    expect(mocks.publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Publish to patient" }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledTimes(1));
    expect(mocks.publish.mock.calls[0][0].body.title).toBe("Asthma follow-up");
    expect(onClose).toHaveBeenCalled();
  });
});
