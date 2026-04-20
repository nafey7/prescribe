import type { Components, Theme } from "@mui/material";

export const MuiDialog: Components<Theme>["MuiDialog"] = {
  defaultProps: {
    scroll: "paper",
  },
  styleOverrides: {
    paper: ({ theme }) => {
      const r =
        typeof theme.shape.borderRadius === "number"
          ? theme.shape.borderRadius
          : 8;
      return {
        display: "flex",
        flexDirection: "column",
        maxHeight: "90vh",
        borderRadius: r * 1.5,
      };
    },
  },
};
