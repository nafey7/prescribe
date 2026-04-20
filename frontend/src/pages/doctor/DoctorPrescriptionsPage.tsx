import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function DoctorPrescriptionsPage() {
  return (
    <Stack spacing={1}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Prescriptions
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Prescription management for this patient will appear here. (Feature 8)
      </Typography>
    </Stack>
  );
}
