import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function DoctorConnectionsPage() {
  return (
    <Stack spacing={1}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Connections
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Pending and active connection requests will appear here. (Feature 3)
      </Typography>
    </Stack>
  );
}
