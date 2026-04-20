import { createTheme } from "@mui/material";
import { components } from "./components";
import { palette } from "./palette";
import { shape } from "./shape";
import { typography } from "./typography";

export const appTheme = createTheme({
  palette,
  typography,
  shape,
  components,
  /** Align with Tailwind defaults used by the pre-migration shell (sm/md/lg). */
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
});

export type AppTheme = typeof appTheme;
