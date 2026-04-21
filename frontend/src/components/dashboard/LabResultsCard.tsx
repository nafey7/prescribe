import { FlaskConical } from "lucide-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import type { MedicalHistoryLabReport } from "../../types/patient";

interface Props {
  lab_reports: MedicalHistoryLabReport[];
}

function indicator(status: string) {
  const s = status.toLowerCase();
  if (s === "elevated" || s === "critical") {
    return (
      <Typography component="span" color="error" sx={{ fontWeight: 700 }}>
        ↑
      </Typography>
    );
  }
  if (s === "low") {
    return (
      <Typography component="span" sx={{ color: "info.main", fontWeight: 700 }}>
        ↓
      </Typography>
    );
  }
  return null;
}

export default function LabResultsCard({ lab_reports }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "success.main", display: "flex" }}>
          <FlaskConical size={18} />
        </Box>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          Recent lab results
        </Typography>
      </Stack>
      {lab_reports.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No lab results in record file.
        </Typography>
      ) : (
        <Stack spacing={2.5}>
          {lab_reports.map((report) => (
            <Box key={report.date}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                {report.date}
              </Typography>
              <Box
                component="ul"
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  listStyle: "none",
                  m: 0,
                  p: 0,
                }}
              >
                {report.results.map((r) => {
                  const s = r.status.toLowerCase();
                  const abnormal = s === "elevated" || s === "critical";
                  const low = s === "low";
                  return (
                    <Box
                      component="li"
                      key={r.name}
                      sx={{
                        display: "inline-flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.5,
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {r.name}:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: abnormal || low ? 600 : 400,
                          color: abnormal
                            ? "error.main"
                            : low
                              ? "info.main"
                              : "text.primary",
                        }}
                      >
                        {r.value}
                      </Typography>
                      {indicator(r.status)}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
