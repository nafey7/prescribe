import { Leaf } from "lucide-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Lifestyle } from "../../types/patient";

interface Props {
  lifestyle: Lifestyle | null;
}

function LifestyleHeader() {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
      <Box sx={{ color: "success.main", display: "flex" }}>
        <Leaf size={18} />
      </Box>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
        Lifestyle
      </Typography>
    </Stack>
  );
}

export default function LifestyleCard({ lifestyle }: Props) {
  if (!lifestyle) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
        <LifestyleHeader />
        <Typography variant="body2" color="text.secondary">
          Not recorded.
        </Typography>
      </Paper>
    );
  }

  const rows: { label: string; value: string }[] = [];
  if (lifestyle.smoking_status && lifestyle.smoking_status !== "unknown") {
    rows.push({
      label: "Smoking",
      value: lifestyle.smoking_notes || lifestyle.smoking_status,
    });
  } else if (lifestyle.smoking_notes) {
    rows.push({ label: "Smoking", value: lifestyle.smoking_notes });
  }
  if (lifestyle.alcohol) rows.push({ label: "Alcohol", value: lifestyle.alcohol });
  if (lifestyle.exercise) rows.push({ label: "Exercise", value: lifestyle.exercise });
  if (lifestyle.diet_notes) rows.push({ label: "Diet", value: lifestyle.diet_notes });

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <LifestyleHeader />
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No lifestyle details recorded.
        </Typography>
      ) : (
        <Stack component="dl" spacing={1} sx={{ m: 0 }}>
          {rows.map((r) => (
            <Box key={r.label}>
              <Typography component="dt" variant="body2" color="text.secondary">
                {r.label}
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                {r.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
