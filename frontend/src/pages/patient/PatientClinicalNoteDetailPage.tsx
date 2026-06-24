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
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ArrowLeft, Flag } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useGetPatientClinicalNoteQuery,
  useRequestClinicalNoteCorrectionMutation,
} from "../../api/patientsApi";
import { usePatientContext } from "../../contexts/PatientContext";
import { paths } from "../../router/paths";
import { Markdown } from "../../ui";

export default function PatientClinicalNoteDetailPage() {
  const { noteId = "" } = useParams<{ noteId: string }>();
  const { currentPatientId } = usePatientContext();
  const { data: note, isLoading, error } = useGetPatientClinicalNoteQuery(
    { patientId: currentPatientId, noteId },
    { skip: !currentPatientId || !noteId }
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState(false);
  const [requestCorrection, { isLoading: submitting }] =
    useRequestClinicalNoteCorrectionMutation();

  async function submitCorrection() {
    if (!comment.trim() || !currentPatientId || !noteId) return;
    setSubmitError(false);
    try {
      await requestCorrection({ patientId: currentPatientId, noteId, comment: comment.trim() }).unwrap();
      setDialogOpen(false);
      setComment("");
    } catch {
      setSubmitError(true);
    }
  }

  if (isLoading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  if (error || !note) return <Alert severity="error">This clinical note could not be found.</Alert>;

  const correction = note.correction_request;
  const hasOpenCorrection = correction?.status === "open";
  return (
    <Stack spacing={2.5}>
      <Button component={Link} to={paths.patient.clinicalNotes} startIcon={<ArrowLeft size={17} />} sx={{ alignSelf: "flex-start" }}>
        Back to clinical notes
      </Button>
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>{note.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {note.doctor_display_name || "Your doctor"} · Encounter {new Date(`${note.encounter_date}T00:00:00`).toLocaleDateString()}
            </Typography>
            <Chip sx={{ mt: 1 }} size="small" label={note.note_type === "encounter_note" ? "Encounter note" : "After-visit summary"} />
          </Box>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Flag size={17} />}
            disabled={hasOpenCorrection}
            onClick={() => { setDialogOpen(true); setSubmitError(false); }}
          >
            {hasOpenCorrection ? "Correction requested" : correction ? "Request another correction" : "Flag for correction"}
          </Button>
        </Stack>
        <Divider sx={{ my: 2.5 }} />
        <Markdown>{note.content}</Markdown>
        {note.updated_at !== note.published_at ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            Revised {new Date(note.updated_at).toLocaleString()}
          </Typography>
        ) : null}
      </Box>

      {correction ? (
        <Alert severity={correction.status === "open" ? "warning" : "success"}>
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {correction.status === "open" ? "Your correction request is under review" : "Your correction request was reviewed"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>Your note: {correction.comment}</Typography>
          {correction.resolution_note ? <Typography variant="body2" sx={{ mt: 0.5 }}>Doctor's response: {correction.resolution_note}</Typography> : null}
        </Alert>
      ) : null}

      <Dialog open={dialogOpen} onClose={submitting ? undefined : () => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request a correction</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Describe the specific fact that appears incorrect and what you believe it should say. This sends a request to the author; it does not edit the note automatically.
            </Typography>
            {submitError ? <Alert severity="error">Could not send your request. It may already have an open correction.</Alert> : null}
            <TextField
              autoFocus
              label="What should be corrected?"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              multiline
              minRows={4}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitCorrection()} disabled={!comment.trim() || submitting}>
            {submitting ? "Sending…" : "Send correction request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
