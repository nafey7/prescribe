import type { Components, Theme } from "@mui/material";

export const MuiLinearProgress: Components<Theme>["MuiLinearProgress"] = {
  styleOverrides: {
    root: ({ theme }) => {
      const r =
        typeof theme.shape.borderRadius === "number"
          ? theme.shape.borderRadius
          : 8;
      return {
        height: 8,
        borderRadius: r * 4,
        overflow: "hidden",
      };
    },
    bar: ({ theme }) => {
      const r =
        typeof theme.shape.borderRadius === "number"
          ? theme.shape.borderRadius
          : 8;
      return { borderRadius: r * 4 };
    },
  },
};
