import { createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { components } from "./components";
import { paletteDark } from "./paletteDark";
import { paletteLight } from "./paletteLight";
import { shape } from "./shape";
import { typography } from "./typography";

export function createAppTheme(mode: PaletteMode) {
  const palette = mode === "light" ? paletteLight : paletteDark;
  return createTheme({
    palette,
    typography,
    shape,
    components,
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
}
