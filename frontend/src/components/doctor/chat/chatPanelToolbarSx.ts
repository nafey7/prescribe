import type { Theme } from "@mui/material";

/** Shared toolbar for the session list column and main chat column (aligned height). */
export function chatPanelToolbarSx(theme: Theme) {
  return {
    flexShrink: 0,
    borderBottom: 1,
    borderColor: "divider",
    px: 2,
    py: 1.5,
    minHeight: theme.spacing(9),
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box" as const,
  };
}
