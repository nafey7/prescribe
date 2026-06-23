import { User } from "lucide-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PatientSummary } from "../../types/patient";

interface Props {
  summary: PatientSummary;
}

export default function PatientSummaryCard({ summary }: Props) {
  const name = `${summary.first_name} ${summary.last_name}`.trim() || "Patient";
  const parts: string[] = [];
  if (summary.age != null) parts.push(`${summary.age} yrs`);
  if (summary.sex) parts.push(summary.sex);
  if (summary.blood_type) parts.push(`Blood ${summary.blood_type}`);

  return (
    <Paper id="profile-demographics" variant="outlined" sx={{ p: 2.5, scrollMarginTop: 80 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (t) => t.palette.success.light,
            color: "success.dark",
          }}
        >
          <User size={22} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" component="h2">
            {name}
          </Typography>
          {parts.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {parts.join(" · ")}
            </Typography>
          )}
          {(summary.weight_kg != null || summary.height_cm != null) && (
            <Stack
              direction="row"
              spacing={3}
              useFlexGap
              sx={{ mt: 1.5, flexWrap: "wrap" }}
            >
              {summary.weight_kg != null && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Weight
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {summary.weight_kg} kg
                  </Typography>
                </Box>
              )}
              {summary.height_cm != null && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Height
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {summary.height_cm} cm
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
