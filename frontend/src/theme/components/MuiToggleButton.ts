import type { Components, Theme } from "@mui/material";

export const MuiToggleButton: Components<Theme>["MuiToggleButton"] = {
  styleOverrides: {
    root: {
      textTransform: "none",
    },
  },
};
