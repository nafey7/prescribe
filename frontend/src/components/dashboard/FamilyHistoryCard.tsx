import { Users } from "lucide-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { FamilyHistoryEntry } from "../../types/patient";

interface Props {
  family_history: FamilyHistoryEntry[];
}

export default function FamilyHistoryCard({ family_history }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "success.main", display: "flex" }}>
          <Users size={18} />
        </Box>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          Family history
        </Typography>
      </Stack>
      {family_history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None recorded.
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {family_history.map((f) => (
            <Typography component="li" key={`${f.relation}-${f.condition}`} variant="body2">
              <Box component="span" sx={{ fontWeight: 600 }}>
                {f.relation}:
              </Box>{" "}
              {f.condition}
            </Typography>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
