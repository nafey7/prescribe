import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useGenerateClinicalNoteDraftMutation,
  usePublishClinicalNoteMutation,
  useReviseClinicalNoteMutation,
} from "../../api/doctorsApi";
import type { ClinicalNote, ClinicalNoteType } from "../../types/clinicalNote";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function ClinicalNoteEditorDialog({
  open,
  doctorId,
  patientId,
  note,
  onClose,
}: {
  open: boolean;
  doctorId: string;
  patientId: string;
  note?: ClinicalNote | null;
  onClose: () => void;
}) {
  const [noteType, setNoteType] = useState<ClinicalNoteType>("after_visit_summary");
  const [encounterDate, setEncounterDate] = useState(localToday());
  const [context, setContext] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [generate, { isLoading: generating }] = useGenerateClinicalNoteDraftMutation();
  const [publish, { isLoading: publishing }] = usePublishClinicalNoteMutation();
  const [revise, { isLoading: revising }] = useReviseClinicalNoteMutation();
  const saving = publishing || revising;

  useEffect(() => {
    if (!open) return;
    setNoteType(note?.note_type ?? "after_visit_summary");
    setEncounterDate(note?.encounter_date ?? localToday());
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setContext("");
    setMessage(null);
  }, [open, note]);

  async function handleGenerate() {
    if (!context.trim()) return;
    setMessage(null);
    try {
      const draft = await generate({
        doctorId,
        patientId,
        body: {
          note_type: noteType,
          encounter_date: encounterDate,
          clinician_context: context.trim(),
        },
      }).unwrap();
      setTitle(draft.title);
      setContent(draft.content);
    } catch {
      setMessage("Could not generate a draft. You can still write the note manually.");
    }
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setMessage(null);
    try {
      if (note) {
        await revise({
          doctorId,
          patientId,
          noteId: note.note_id,
          body: { title: title.trim(), content: content.trim() },
        }).unwrap();
      } else {
        await publish({
          doctorId,
          patientId,
          body: {
            note_type: noteType,
            encounter_date: encounterDate,
            title: title.trim(),
            content: content.trim(),
          },
        }).unwrap();
      }
      onClose();
    } catch {
      setMessage(note ? "Could not save the revision." : "Could not publish the note.");
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{note ? "Revise clinical note" : "Create clinical note"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            {note
              ? "Patients will see saved changes and the updated time."
              : "AI output is a draft. Review every clinical detail before publishing it to the patient."}
          </Alert>
          {message ? <Alert severity="error">{message}</Alert> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Note type"
              value={noteType}
              onChange={(event) => setNoteType(event.target.value as ClinicalNoteType)}
              disabled={Boolean(note) || generating || saving}
              fullWidth
            >
              <MenuItem value="encounter_note">Encounter note</MenuItem>
              <MenuItem value="after_visit_summary">After-visit summary</MenuItem>
            </TextField>
            <TextField
              label="Encounter date"
              type="date"
              value={encounterDate}
              onChange={(event) => setEncounterDate(event.target.value)}
              disabled={Boolean(note) || generating || saving}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          {!note ? (
            <Stack spacing={1}>
              <TextField
                label="Clinician encounter context"
                helperText="Enter only what happened during this visit: findings, decisions, instructions, and follow-up."
                value={context}
                onChange={(event) => setContext(event.target.value)}
                multiline
                minRows={4}
                slotProps={{ htmlInput: { maxLength: 5000 } }}
                disabled={generating || saving}
                fullWidth
              />
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} /> : <Sparkles size={17} />}
                onClick={() => void handleGenerate()}
                disabled={!context.trim() || generating || saving}
                sx={{ alignSelf: "flex-start" }}
              >
                {generating ? "Generating draft…" : "Generate brief"}
              </Button>
            </Stack>
          ) : null}
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Patient-visible note
          </Typography>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 160 } }}
            disabled={generating || saving}
            fullWidth
          />
          <TextField
            label="Content"
            helperText="Markdown headings and lists are supported."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 12000 } }}
            disabled={generating || saving}
            multiline
            minRows={10}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={!title.trim() || !content.trim() || generating || saving}
        >
          {saving ? "Saving…" : note ? "Save revision" : "Publish to patient"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
