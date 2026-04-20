import { Stethoscope } from "lucide-react";
import { alpha } from "@mui/material";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

/**
 * `/patient/doctors` — placeholder for the patient's "my doctors" surface.
 *
 * Phase 3 ships the route with an empty state so deep links and the sidebar
 * entry resolve cleanly. The full UX (connected doctors list + request
 * connection CTA wired through `connectionsApi` / `doctorsApi`) lands in a
 * follow-up phase.
 */
export default function PatientDoctorsPage() {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: "center", maxWidth: 600, mx: "auto" }}>
      <Box
        sx={{
          mx: "auto",
          mb: 2,
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
          color: "primary.main",
        }}
      >
        <Stethoscope size={24} aria-hidden />
      </Box>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
        My Doctors
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        See the doctors you are connected to and request new connections.
        Coming soon.
      </Typography>
    </Paper>
  );
}
