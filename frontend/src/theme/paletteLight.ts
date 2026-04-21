import type { PaletteOptions } from "@mui/material";

/**
 * Light appearance — values preserved from the pre–color-mode palette.
 */
export const paletteLight: PaletteOptions = {
  mode: "light",
  primary: {
    main: "#2563eb",
    light: "#60a5fa",
    dark: "#1d4ed8",
    contrastText: "#ffffff",
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  /** Doctor portal accent (Tailwind teal scale). */
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
    main: "#0284c7",
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
