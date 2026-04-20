import { Info } from "lucide-react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";

export default function DuplicateIndicator({
  description,
}: {
  description: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={(t) => ({
        alignItems: "flex-start",
        borderRadius: 1,
        px: 1.5,
        py: 1,
        bgcolor: alpha(t.palette.primary.main, 0.08),
        color: "primary.dark",
      })}
    >
      <Box sx={{ display: "flex", mt: 0.125, flexShrink: 0 }}>
        <Info size={16} />
      </Box>
      <Typography variant="body2">
        Already in your profile — {description}
      </Typography>
    </Stack>
  );
}
