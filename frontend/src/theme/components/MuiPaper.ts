import type { Components, Theme } from "@mui/material";

export const MuiPaper: Components<Theme>["MuiPaper"] = {
  defaultProps: {
    variant: "outlined",
  },
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: Number(theme.shape.borderRadius) * 2,
    }),
  },
};
