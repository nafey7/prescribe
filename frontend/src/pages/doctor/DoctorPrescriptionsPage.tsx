import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Bot, ClipboardList, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useCancelPrescriptionMutation,
  useCheckDrugInteractionsMutation,
  useCreatePrescriptionMutation,
  useListPrescriptionsQuery,
} from "../../api/prescriptionsApi";
import DrugInteractionWarnings from "../../components/DrugInteractionWarnings";
import PrescriptionCopilotModal from "../../components/PrescriptionCopilotModal";
import { useIdentity } from "../../contexts/IdentityContext";
import type {
  DrugInteraction,
  DrugInteractionCheckResponse,
  Medication,
  MedicationSuggestion,
  Prescription,
  PrescriptionSuggestionResponse,
} from "../../types/doctor";

const STATUS_COLOR: Record<
  string,
  "success" | "error" | "warning" | "default"
> = {
  ACTIVE: "success",
  DRAFT: "warning",
  CANCELLED: "error",
  SUPERSEDED: "default",
};

function emptyMed(): Medication {
  return { name: "", dosage: "", frequency: "", duration: "", instructions: "" };
}

function PrescriptionCard({
  rx,
  onCancel,
  cancelling,
}: {
  rx: Prescription;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        p: 2.5,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip
              label={rx.status}
              size="small"
              color={STATUS_COLOR[rx.status] ?? "default"}
              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
            />
            <Typography variant="caption" color="text.secondary">
              {new Date(rx.issued_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Typography>
          </Stack>

          {rx.diagnosis_summary && (
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.5 }}>
              {rx.diagnosis_summary}
            </Typography>
          )}

          {rx.medications.length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {rx.medications.map((m, i) => (
                <Box key={i}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {m.name}
                    {m.dosage && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {" "}
                        · {m.dosage}
                      </Typography>
                    )}
                    {m.frequency && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {" "}
                        · {m.frequency}
                      </Typography>
                    )}
                    {m.duration && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {" "}
                        for {m.duration}
                      </Typography>
                    )}
                  </Typography>
                  {m.instructions && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", ml: 0 }}
                    >
                      {m.instructions}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}

          {rx.notes && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontStyle: "italic" }}
            >
              {rx.notes}
            </Typography>
          )}
        </Stack>

        {rx.status === "ACTIVE" && (
          <IconButton
            size="small"
            color="error"
            title="Cancel prescription"
            disabled={cancelling}
            onClick={onCancel}
            sx={{ flexShrink: 0 }}
          >
            {cancelling ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Trash2 size={16} />
            )}
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}

function suggestionToMedication(m: MedicationSuggestion): Medication {
  return {
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency,
    duration: m.duration,
    instructions: m.instructions,
  };
}

function NewPrescriptionDialog({
  open,
  doctorId,
  patientId,
  onClose,
  prefill,
}: {
  open: boolean;
  doctorId: string;
  patientId: string;
  onClose: () => void;
  prefill?: PrescriptionSuggestionResponse;
}) {
  const [diagnosisSummary, setDiagnosisSummary] = useState(
    prefill?.diagnosis_summary ?? ""
  );
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [medications, setMedications] = useState<Medication[]>(
    prefill?.medications?.length
      ? prefill.medications.map(suggestionToMedication)
      : [emptyMed()]
  );
  const [error, setError] = useState<string | null>(null);
  const [interactionResult, setInteractionResult] =
    useState<DrugInteractionCheckResponse | null>(null);
  const [interactionSnackbar, setInteractionSnackbar] = useState(false);
  // Stale flag: true when medications have changed since last check
  const [interactionStale, setInteractionStale] = useState(false);

  const [createPrescription, { isLoading }] = useCreatePrescriptionMutation();
  const [checkInteractions, { isLoading: isCheckingInteractions }] =
    useCheckDrugInteractionsMutation();

  const hasNamedMeds = medications.some((m) => m.name.trim());

  function updateMed(index: number, field: keyof Medication, value: string) {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
    setInteractionStale(true);
  }

  function addMed() {
    setMedications((prev) => [...prev, emptyMed()]);
    setInteractionStale(true);
  }

  function removeMed(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
    setInteractionStale(true);
  }

  async function handleCheckInteractions() {
    try {
      const result = await checkInteractions({
        doctorId,
        patientId,
        body: {
          medications: medications
            .filter((m) => m.name.trim())
            .map((m) => ({ name: m.name, dosage: m.dosage, frequency: m.frequency })),
        },
      }).unwrap();
      setInteractionResult(result);
      setInteractionStale(false);
    } catch {
      setInteractionSnackbar(true);
    }
  }

  // Auto-trigger check when dialog opens with a copilot prefill
  useEffect(() => {
    if (open && prefill && hasNamedMeds) {
      void handleCheckInteractions();
    }
    // Only fire when the dialog opens with prefill data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  async function handleSubmit() {
    setError(null);
    const meds = medications.filter((m) => m.name.trim());
    try {
      await createPrescription({
        doctorId,
        patientId,
        body: {
          diagnosis_summary: diagnosisSummary.trim(),
          notes: notes.trim(),
          medications: meds,
        },
      }).unwrap();
      handleClose();
    } catch {
      setError("Failed to create prescription. Please try again.");
    }
  }

  function handleClose() {
    setDiagnosisSummary("");
    setNotes("");
    setMedications([emptyMed()]);
    setError(null);
    setInteractionResult(null);
    setInteractionStale(false);
    onClose();
  }

  // Re-seed from prefill whenever it changes (copilot accept)
  // This is handled by the key prop on the dialog at the call site.

  const interactions: DrugInteraction[] = interactionStale
    ? []
    : (interactionResult?.interactions ?? []);

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            New Prescription
            <IconButton size="small" onClick={handleClose} disabled={isLoading}>
              <X size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Diagnosis summary"
              value={diagnosisSummary}
              onChange={(e) => setDiagnosisSummary(e.target.value)}
              fullWidth
              size="small"
            />

            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
            />

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: 0.5, display: "block", mb: 1 }}
              >
                MEDICATIONS
              </Typography>

              <Stack spacing={2}>
                {medications.map((m, i) => (
                  <Box
                    key={i}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1.5,
                      p: 1.5,
                      position: "relative",
                    }}
                  >
                    {medications.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => removeMed(i)}
                        sx={{ position: "absolute", top: 6, right: 6 }}
                        title="Remove medication"
                      >
                        <X size={14} />
                      </IconButton>
                    )}
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5}>
                        <TextField
                          label="Name"
                          value={m.name}
                          onChange={(e) => updateMed(i, "name", e.target.value)}
                          size="small"
                          sx={{ flex: 2 }}
                          required
                        />
                        <TextField
                          label="Dosage"
                          value={m.dosage}
                          onChange={(e) => updateMed(i, "dosage", e.target.value)}
                          size="small"
                          sx={{ flex: 1 }}
                          placeholder="e.g. 10mg"
                        />
                      </Stack>
                      <Stack direction="row" spacing={1.5}>
                        <TextField
                          label="Frequency"
                          value={m.frequency}
                          onChange={(e) =>
                            updateMed(i, "frequency", e.target.value)
                          }
                          size="small"
                          sx={{ flex: 1 }}
                          placeholder="e.g. twice daily"
                        />
                        <TextField
                          label="Duration"
                          value={m.duration}
                          onChange={(e) =>
                            updateMed(i, "duration", e.target.value)
                          }
                          size="small"
                          sx={{ flex: 1 }}
                          placeholder="e.g. 30 days"
                        />
                      </Stack>
                      <TextField
                        label="Instructions"
                        value={m.instructions}
                        onChange={(e) =>
                          updateMed(i, "instructions", e.target.value)
                        }
                        size="small"
                        fullWidth
                        placeholder="e.g. Take with food"
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Button
                size="small"
                startIcon={<Plus size={14} />}
                onClick={addMed}
                sx={{ mt: 1 }}
                disabled={isLoading}
              >
                Add medication
              </Button>
            </Box>

            <Button
              variant="outlined"
              onClick={() => void handleCheckInteractions()}
              disabled={isCheckingInteractions || !hasNamedMeds || isLoading}
              startIcon={
                isCheckingInteractions ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {isCheckingInteractions
                ? "Checking…"
                : interactionStale && interactionResult
                  ? "Re-check Interactions"
                  : "Check Interactions"}
            </Button>

            <DrugInteractionWarnings
              interactions={interactions}
              checked={interactionResult !== null && !interactionStale}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={isLoading}
          >
            {isLoading ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={interactionSnackbar}
        autoHideDuration={5000}
        onClose={() => setInteractionSnackbar(false)}
        message="Interaction check failed — verify manually."
      />
    </>
  );
}

export default function DoctorPrescriptionsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentDoctorId } = useIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [prefill, setPrefill] = useState<PrescriptionSuggestionResponse | undefined>();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, isLoading, error } = useListPrescriptionsQuery(
    { doctorId: currentDoctorId!, patientId: patientId! },
    { skip: !currentDoctorId || !patientId }
  );

  const [cancelPrescription] = useCancelPrescriptionMutation();

  async function handleCancel(prescriptionId: string) {
    if (!currentDoctorId || !patientId) return;
    setCancellingId(prescriptionId);
    try {
      await cancelPrescription({
        doctorId: currentDoctorId,
        patientId,
        prescriptionId,
      }).unwrap();
    } finally {
      setCancellingId(null);
    }
  }

  if (!currentDoctorId) {
    return (
      <Typography variant="body2" sx={{ color: "warning.dark" }}>
        Select a doctor in the dev identity bar to view prescriptions.
      </Typography>
    );
  }

  if (!patientId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Missing patient.
      </Typography>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        <Stack
          direction="row"
          sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Prescriptions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage prescriptions for this patient.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Bot size={16} />}
              onClick={() => setCopilotOpen(true)}
            >
              AI Copilot
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => {
                setPrefill(undefined);
                setDialogOpen(true);
              }}
            >
              New prescription
            </Button>
          </Stack>
        </Stack>

        <Divider />

        {isLoading && (
          <Stack sx={{ alignItems: "center", py: 8 }} aria-busy="true">
            <CircularProgress />
          </Stack>
        )}

        {error && !isLoading && (
          <Alert severity="error">Failed to load prescriptions.</Alert>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <Box
            sx={{
              borderRadius: 2,
              border: 1,
              borderStyle: "dashed",
              borderColor: "divider",
              bgcolor: "background.paper",
              py: 8,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                color: "text.disabled",
                display: "flex",
                justifyContent: "center",
                mb: 1.5,
              }}
            >
              <ClipboardList size={40} strokeWidth={1.25} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              No prescriptions for this patient.
            </Typography>
            <Button
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => setDialogOpen(true)}
              sx={{ mt: 1.5 }}
            >
              Create the first one
            </Button>
          </Box>
        )}

        {!isLoading && data && data.length > 0 && (
          <Stack
            component="ul"
            spacing={1.5}
            sx={{ listStyle: "none", m: 0, p: 0 }}
          >
            {data.map((rx) => (
              <Box component="li" key={rx.prescription_id}>
                <PrescriptionCard
                  rx={rx}
                  onCancel={() => void handleCancel(rx.prescription_id)}
                  cancelling={cancellingId === rx.prescription_id}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      <PrescriptionCopilotModal
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        doctorId={currentDoctorId}
        patientId={patientId}
        onAccept={(suggestion) => {
          setCopilotOpen(false);
          setPrefill(suggestion);
          setDialogOpen(true);
        }}
      />

      <NewPrescriptionDialog
        key={prefill ? JSON.stringify(prefill) : "empty"}
        open={dialogOpen}
        doctorId={currentDoctorId}
        patientId={patientId}
        onClose={() => setDialogOpen(false)}
        prefill={prefill}
      />
    </>
  );
}
