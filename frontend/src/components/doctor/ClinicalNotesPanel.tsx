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
import { FilePlus2, Pencil } from "lucide-react";
import { useState } from "react";
import {
  useListDoctorClinicalNotesQuery,
  useResolveClinicalNoteCorrectionMutation,
} from "../../api/doctorsApi";
import type { ClinicalNote } from "../../types/clinicalNote";
import { Markdown } from "../../ui";
import ClinicalNoteEditorDialog from "./ClinicalNoteEditorDialog";

function noteTypeLabel(note: ClinicalNote) {
  return note.note_type === "encounter_note" ? "Encounter note" : "After-visit summary";
}

export default function ClinicalNotesPanel({
  doctorId,
  patientId,
}: {
  doctorId: string;
  patientId: string;
}) {
  const { data, isLoading, error } = useListDoctorClinicalNotesQuery({ doctorId, patientId });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalNote | null>(null);
  const [resolving, setResolving] = useState<ClinicalNote | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolveError, setResolveError] = useState(false);
  const [resolveCorrection, { isLoading: resolvingRequest }] =
    useResolveClinicalNoteCorrectionMutation();

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(note: ClinicalNote) {
    setEditing(note);
    setEditorOpen(true);
  }

  async function handleResolve() {
    const correction = resolving?.correction_request;
    if (!resolving || !correction || !resolution.trim()) return;
    setResolveError(false);
    try {
      await resolveCorrection({
        doctorId,
        patientId,
        noteId: resolving.note_id,
        correctionId: correction.correction_id,
        resolutionNote: resolution.trim(),
      }).unwrap();
      setResolving(null);
      setResolution("");
    } catch {
      setResolveError(true);
    }
  }

  return (
    <Box component="section" aria-labelledby="clinical-notes-heading" sx={{ mt: 4 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography id="clinical-notes-heading" variant="h5" sx={{ fontWeight: 700 }}>
            Shared clinical notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Notes published to this patient and correction requests awaiting review.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FilePlus2 size={18} />} onClick={openCreate}>
          Create clinical note
        </Button>
      </Stack>

      {isLoading ? <CircularProgress size={28} /> : null}
      {error ? <Alert severity="error">Could not load clinical notes.</Alert> : null}
      {!isLoading && !error && (data?.notes.length ?? 0) === 0 ? (
        <Alert severity="info">No notes have been published to this patient yet.</Alert>
      ) : null}

      <Stack spacing={2}>
        {data?.notes.map((note) => {
          const correction = note.correction_request;
          return (
            <Box key={note.note_id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2.5 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 650 }}>{note.title}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5, flexWrap: "wrap" }}>
                    <Chip size="small" label={noteTypeLabel(note)} />
                    <Typography variant="caption" color="text.secondary">
                      Encounter {new Date(`${note.encounter_date}T00:00:00`).toLocaleDateString()}
                    </Typography>
                    {note.updated_at !== note.published_at ? <Chip size="small" variant="outlined" label="Revised" /> : null}
                  </Stack>
                </Box>
                <Button size="small" startIcon={<Pencil size={15} />} onClick={() => openEdit(note)}>Edit</Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Markdown>{note.content}</Markdown>
              {correction ? (
                <Alert
                  severity={correction.status === "open" ? "warning" : "success"}
                  sx={{ mt: 2 }}
                  action={correction.status === "open" ? (
                    <Button color="inherit" size="small" onClick={() => { setResolving(note); setResolution(""); setResolveError(false); }}>
                      Resolve
                    </Button>
                  ) : undefined}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {correction.status === "open" ? "Correction requested" : "Correction request resolved"}
                  </Typography>
                  <Typography variant="body2">{correction.comment}</Typography>
                  {correction.resolution_note ? <Typography variant="body2" sx={{ mt: 0.5 }}>Response: {correction.resolution_note}</Typography> : null}
                </Alert>
              ) : null}
            </Box>
          );
        })}
      </Stack>

      <ClinicalNoteEditorDialog
        open={editorOpen}
        doctorId={doctorId}
        patientId={patientId}
        note={editing}
        onClose={() => setEditorOpen(false)}
      />

      <Dialog open={Boolean(resolving)} onClose={resolvingRequest ? undefined : () => setResolving(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve correction request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">Revise the note first if its patient-visible content needs to change, then explain the outcome here.</Alert>
            {resolveError ? <Alert severity="error">Could not resolve the request.</Alert> : null}
            <Typography variant="body2">Patient request: {resolving?.correction_request?.comment}</Typography>
            <TextField
              label="Response to patient"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolving(null)} disabled={resolvingRequest}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleResolve()} disabled={!resolution.trim() || resolvingRequest}>
            {resolvingRequest ? "Resolving…" : "Mark resolved"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
