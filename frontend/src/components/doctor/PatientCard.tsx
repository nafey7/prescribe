import { ChevronRight, UserRound } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { paths } from "../../router/paths";
import type { ConnectedPatientSummary } from "../../types/doctor";

function initials(p: ConnectedPatientSummary): string {
  const a = p.first_name?.trim().charAt(0) ?? "";
  const b = p.last_name?.trim().charAt(0) ?? "";
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

function formatConnected(since: string): string {
  if (!since) return "—";
  const d = new Date(since);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return since;
}

function formatLastVisit(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PatientCard({ patient }: { patient: ConnectedPatientSummary }) {
  const inn = initials(patient);
  const name =
    `${patient.first_name} ${patient.last_name}`.trim() || "Patient";
  const demo: string[] = [];
  if (patient.sex) demo.push(patient.sex);
  if (patient.age != null) demo.push(`${patient.age}`);
  const conditions =
    patient.conditions.length > 0
      ? patient.conditions.slice(0, 3).join(", ")
      : "None reported";

  return (
    <Paper
      component={RouterLink}
      to={paths.doctor.patientDetail(
        encodeURIComponent(patient.patient_id)
      )}
      aria-label={`View patient ${name}`}
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        textDecoration: "none",
        color: "inherit",
        display: "block",
        "&:hover": {
          borderColor: "secondary.light",
          boxShadow: 2,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 48,
            height: 48,
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
          {inn && inn !== "?" ? (
            <span aria-hidden>{inn}</span>
          ) : (
            <UserRound size={22} aria-hidden />
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {demo.length > 0 ? `${demo.join(" · ")} · ` : ""}
            {conditions}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Connected since {formatConnected(patient.connected_since)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Last visited: {formatLastVisit(patient.last_interaction)}
          </Typography>
        </Box>
        <Box
          sx={{
            color: "secondary.main",
            display: "flex",
            alignItems: "center",
          }}
          aria-hidden
        >
          <ChevronRight size={20} />
        </Box>
      </Stack>
    </Paper>
  );
}
