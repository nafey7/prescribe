import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { DoctorDashboardResponse } from "../../../types/doctor";

export default function DoctorWelcomeBanner({
  data,
}: {
  data: DoctorDashboardResponse | null;
}) {
  if (!data) return null;
  const sub = [data.specialization, data.institution].filter(Boolean).join(" · ");
  return (
    <Paper variant="outlined" sx={{ px: 2.5, py: 2, borderRadius: 3 }}>
      <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
        Welcome, {data.doctor_name}
      </Typography>
      {sub ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {sub}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Your practice overview
        </Typography>
      )}
    </Paper>
  );
}
