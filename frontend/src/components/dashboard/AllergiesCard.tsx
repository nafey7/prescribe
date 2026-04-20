import { AlertTriangle } from "lucide-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import type { Allergy } from "../../types/patient";

interface Props {
  allergies: Allergy[];
}

export default function AllergiesCard({ allergies }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({
        p: 2.5,
        height: "100%",
        borderColor: t.palette.warning.light,
        bgcolor: alpha(t.palette.warning.light, 0.35),
      })}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, alignItems: "center", color: "warning.dark" }}
      >
        <AlertTriangle size={18} />
        <Typography variant="subtitle1" component="h2" color="warning.dark" sx={{ fontWeight: 600 }}>
          Allergies
        </Typography>
      </Stack>
      {allergies.length === 0 ? (
        <Typography variant="body2" color="warning.dark" sx={{ opacity: 0.85 }}>
          No known allergies recorded.
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {allergies.map((a) => (
            <Typography
              component="li"
              key={a.substance}
              variant="body2"
              sx={{ color: "warning.dark" }}
            >
              <Box component="span" sx={{ fontWeight: 700 }}>
                {a.substance}
              </Box>
              {a.reaction ? ` — ${a.reaction}` : null}
            </Typography>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
