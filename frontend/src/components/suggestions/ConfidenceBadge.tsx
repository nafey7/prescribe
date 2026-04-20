import Chip from "@mui/material/Chip";
import type { ConfidenceLevel } from "../../types/suggestion";

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; color: "success" | "warning" | "error" }
> = {
  high: { label: "High", color: "success" },
  medium: { label: "Medium", color: "warning" },
  low: { label: "Low", color: "error" },
};

export default function ConfidenceBadge({
  level,
}: {
  level: ConfidenceLevel;
}) {
  const c = CONFIG[level] ?? CONFIG.medium;
  return (
    <Chip
      size="small"
      label={c.label}
      color={c.color}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}
