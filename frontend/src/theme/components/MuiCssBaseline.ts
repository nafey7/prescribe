import type { Components, Theme } from "@mui/material";

export const MuiCssBaseline: Components<Theme>["MuiCssBaseline"] = {
  styleOverrides: {
    body: ({ theme }: { theme: Theme }) => ({
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
    }),
  },
};
