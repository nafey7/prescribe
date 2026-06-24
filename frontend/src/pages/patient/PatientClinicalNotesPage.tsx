import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChevronRight, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { useListPatientClinicalNotesQuery } from "../../api/patientsApi";
import { usePatientContext } from "../../contexts/PatientContext";
import { paths } from "../../router/paths";

export default function PatientClinicalNotesPage() {
  const { currentPatientId } = usePatientContext();
  const { data, isLoading, error } = useListPatientClinicalNotesQuery(
    { patientId: currentPatientId, skip: 0, limit: 100 },
    { skip: !currentPatientId }
  );

  if (!currentPatientId) return <Alert severity="info">Select a patient profile to view clinical notes.</Alert>;
  if (isLoading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Could not load clinical notes. Please try again.</Alert>;

  const notes = data?.notes ?? [];
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Clinical notes</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Encounter notes and after-visit summaries shared by your doctors.
        </Typography>
      </Box>
      {notes.length === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", py: 6 }}>
          <ClipboardList size={42} strokeWidth={1.5} aria-hidden />
          <Typography variant="h6">No clinical notes yet</Typography>
          <Typography variant="body2" color="text.secondary">Notes published by your doctors will appear here.</Typography>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          {notes.map((note) => (
            <Card key={note.note_id} variant="outlined">
              <CardActionArea component={Link} to={paths.patient.clinicalNoteDetail(note.note_id)}>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 650 }} noWrap>{note.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {note.doctor_display_name || "Your doctor"} · {new Date(`${note.encounter_date}T00:00:00`).toLocaleDateString()}
                      </Typography>
                      <Stack direction="row" spacing={0.75}>
                        <Chip size="small" label={note.note_type === "encounter_note" ? "Encounter note" : "After-visit summary"} />
                        {note.correction_request?.status === "open" ? <Chip size="small" color="warning" label="Correction requested" /> : null}
                      </Stack>
                    </Stack>
                    <ChevronRight size={20} aria-hidden />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
