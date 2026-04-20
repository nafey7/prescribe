import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { paths } from "../../../router/paths";
import type { RecentPatientSummary } from "../../../types/doctor";
import { formatRelativeShort } from "./formatRelative";

function initials(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

export default function RecentPatientsCard({
  patients,
}: {
  patients: RecentPatientSummary[];
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Recent patients
      </Typography>
      {patients.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          When you have active connections, recently active patients will show
          here.
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            mt: 2,
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
          }}
        >
          {patients.map((p) => {
            const display = [p.first_name, p.last_name].filter(Boolean).join(" ");
            const demo = [p.sex, p.age != null ? `${p.age}` : ""]
              .filter(Boolean)
              .join(", ");
            const last = p.last_interaction
              ? formatRelativeShort(p.last_interaction)
              : null;
            return (
              <Box component="li" key={p.patient_id}>
                <Paper
                  component={RouterLink}
                  to={paths.doctor.patientDetail(
                    encodeURIComponent(p.patient_id)
                  )}
                  variant="outlined"
                  sx={(t) => ({
                    p: 2,
                    borderRadius: 2,
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    bgcolor: alpha(t.palette.secondary.main, 0.06),
                    "&:hover": {
                      borderColor: "secondary.light",
                      bgcolor: "background.paper",
                    },
                  })}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "secondary.light",
                        color: "secondary.dark",
                        typography: "subtitle2",
                        fontWeight: 700,
                      }}
                    >
                      {initials(p.first_name, p.last_name)}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 600 }}>
                        {display || "Patient"}
                      </Typography>
                      {demo ? (
                        <Typography variant="caption" color="text.secondary">
                          {demo}
                        </Typography>
                      ) : null}
                      <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
                        {last ? `Last: ${last}` : "No recent activity"}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            );
          })}
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Link
          component={RouterLink}
          to={paths.doctor.patients}
          underline="hover"
          variant="body2"
          sx={{ color: "secondary.dark", fontWeight: 600 }}
        >
          View all patients →
        </Link>
      </Box>
    </Paper>
  );
}
