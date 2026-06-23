import { Activity } from "lucide-react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Condition } from "../../types/patient";

interface Props {
  conditions: Condition[];
}

export default function ConditionsCard({ conditions }: Props) {
  return (
    <Paper id="profile-conditions" variant="outlined" sx={{ p: 2.5, height: "100%", scrollMarginTop: 80 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "success.main", display: "flex" }}>
          <Activity size={18} />
        </Box>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          Active conditions
        </Typography>
      </Stack>
      {conditions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No active conditions recorded.
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {conditions.map((c) => (
            <Box
              component="li"
              key={`${c.name}-${c.diagnosed_year ?? ""}`}
              sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {c.name}
              </Typography>
              {c.status && (
                <Chip label={c.status} size="small" color="success" variant="outlined" />
              )}
              {c.diagnosed_year != null && (
                <Typography variant="caption" color="text.secondary">
                  since {c.diagnosed_year}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
