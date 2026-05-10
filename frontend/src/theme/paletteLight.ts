import type { PaletteOptions } from "@mui/material";

/**
 * Light appearance — primary accent is emerald (clinical / growth).
 */
export const paletteLight: PaletteOptions = {
  mode: "light",
  primary: {
    main: "#059669",
    light: "#34d399",
    dark: "#047857",
    contrastText: "#ffffff",
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  secondary: {
    main: "#0d9488",
    light: "#5eead4",
    dark: "#0f766e",
    contrastText: "#ffffff",
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
  },
  error: {
    main: "#dc2626",
  },
  warning: {
    main: "#d97706",
    light: "#fef3c7",
    dark: "#b45309",
  },
  info: {
    main: "#0d9488",
  },
  success: {
    main: "#16a34a",
  },
  text: {
    primary: "#111827",
    secondary: "#6b7280",
    disabled: "#9ca3af",
  },
  background: {
    default: "#f9fafb",
    paper: "#ffffff",
  },
  divider: "#e5e7eb",
  /** Replaces fixed `grey[50]` / `grey[100]` fills that do not track dark mode. */
  surface: {
    subtle: "#fafafa",
    muted: "#f3f4f6",
    elevated: "#ffffff",
  },
};
