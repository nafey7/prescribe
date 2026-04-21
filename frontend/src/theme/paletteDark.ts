import type { PaletteOptions } from "@mui/material";

/**
 * Dark appearance — tuned for contrast on neutral shells (WCAG-oriented spot-check).
 */
export const paletteDark: PaletteOptions = {
  mode: "dark",
  primary: {
    main: "#60a5fa",
    light: "#93c5fd",
    dark: "#3b82f6",
    contrastText: "#0b1220",
    50: "#172554",
    100: "#1e3a8a",
    200: "#1e40af",
    300: "#1d4ed8",
    400: "#2563eb",
    500: "#3b82f6",
    600: "#60a5fa",
    700: "#93c5fd",
    800: "#bfdbfe",
    900: "#dbeafe",
  },
  secondary: {
    main: "#2dd4bf",
    light: "#5eead4",
    dark: "#14b8a6",
    contrastText: "#042f2e",
    50: "#042f2e",
    100: "#134e4a",
    200: "#115e59",
    300: "#0f766e",
    400: "#0d9488",
    500: "#14b8a6",
    600: "#2dd4bf",
    700: "#5eead4",
    800: "#99f6e4",
    900: "#ccfbf1",
  },
  error: {
    main: "#f87171",
  },
  warning: {
    main: "#fbbf24",
    light: "#422006",
    dark: "#fde68a",
  },
  info: {
    main: "#38bdf8",
  },
  success: {
    main: "#4ade80",
  },
  text: {
    primary: "#f9fafb",
    secondary: "#9ca3af",
    disabled: "#6b7280",
  },
  background: {
    default: "#0d1117",
    paper: "#161b22",
  },
  divider: "rgba(148, 163, 184, 0.22)",
  surface: {
    subtle: "#1c2128",
    muted: "#22272e",
    elevated: "#2d333b",
  },
};
