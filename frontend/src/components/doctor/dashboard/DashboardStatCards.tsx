import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { paths } from "../../../router/paths";
import type { DashboardStats } from "../../../types/doctor";

export default function DashboardStatCards({
  stats,
}: {
  stats: DashboardStats | undefined;
}) {
  if (!stats) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 4 }}>
            <Skeleton variant="rounded" height={112} sx={{ borderRadius: 4 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  const card = (title: string, value: number, footer: ReactNode) => (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: 2, boxShadow: 1, height: "100%" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, letterSpacing: 0.5 }}
      >
        {title}
      </Typography>
      <Typography
        variant="h3"
        component="p"
        sx={{ mt: 1, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
      >
        {value}
      </Typography>
      <Box sx={{ mt: 1.5 }}>{footer}</Box>
    </Paper>
  );

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 4 }}>
        {card(
          "CONNECTED PATIENTS",
          stats.connected_patients,
          <Link
            component={RouterLink}
            to={paths.doctor.patients}
            variant="body2"
            color="secondary.dark"
            underline="hover"
            sx={{ fontWeight: 500 }}
          >
            View all →
          </Link>
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {card(
          "PENDING REQUESTS",
          stats.pending_requests,
          <Link
            component={RouterLink}
            to={paths.doctor.connections}
            variant="body2"
            color="secondary.dark"
            underline="hover"
            sx={{ fontWeight: 500 }}
          >
            Review →
          </Link>
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {card(
          "TOTAL PRESCRIPTIONS",
          stats.total_prescriptions,
          <Typography variant="body2" color="text.disabled">
            All time
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}
