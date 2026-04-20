import { History } from "lucide-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import type { MedicalHistoryEvent } from "../../types/patient";

interface Props {
  events: MedicalHistoryEvent[];
}

export default function MedicalTimeline({ events }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "success.main", display: "flex" }}>
          <History size={18} />
        </Box>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          Medical history
        </Typography>
      </Stack>
      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No past events listed.
        </Typography>
      ) : (
        <Stack component="ul" spacing={1.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {events.map((e) => (
            <Box
              component="li"
              key={`${e.year}-${e.description}`}
              sx={{
                display: "flex",
                gap: 1.5,
                pl: 1.5,
                borderLeft: (t) => `2px solid ${alpha(t.palette.success.main, 0.35)}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  width: 56,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                  color: "success.dark",
                  fontWeight: 600,
                }}
              >
                {e.year}
              </Typography>
              <Typography variant="body2" color="text.primary">
                {e.description}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
