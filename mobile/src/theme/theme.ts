import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#059669",
    primaryContainer: "#D1FAE5",
    onPrimaryContainer: "#064E3B",
    secondary: "#0D9488",
    secondaryContainer: "#CCFBF1",
    onSecondaryContainer: "#134E4A",
    tertiary: "#0F766E",
    background: "#F9FAFB",
    surface: "#FFFFFF",
    surfaceVariant: "#F3F4F6",
    onSurface: "#111827",
    onSurfaceVariant: "#6B7280",
    outline: "#E5E7EB",
    outlineVariant: "#D1D5DB",
    error: "#DC2626",
    errorContainer: "#FEE2E2",
    onErrorContainer: "#991B1B",
  },
  roundness: 8,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#34D399",
    primaryContainer: "#064E3B",
    onPrimaryContainer: "#D1FAE5",
    secondary: "#2DD4BF",
    secondaryContainer: "#134E4A",
    onSecondaryContainer: "#CCFBF1",
    tertiary: "#5EEAD4",
    background: "#101413",
    surface: "#171D1B",
    surfaceVariant: "#202826",
    onSurface: "#F3F4F6",
    onSurfaceVariant: "#A7B0AD",
    outline: "#303A37",
    outlineVariant: "#4B5552",
    error: "#FCA5A5",
    errorContainer: "#7F1D1D",
    onErrorContainer: "#FEE2E2",
  },
  roundness: 8,
};

export const theme = lightTheme;

export type AppTheme = typeof lightTheme;
