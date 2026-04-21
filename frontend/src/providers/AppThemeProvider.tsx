import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material";
import type { Theme } from "@mui/material";
import { useMemo, type ReactNode } from "react";
import { useColorMode } from "../contexts/ColorModeContext";
import { createAppTheme } from "../theme";

type AppThemeProviderProps = {
  children: ReactNode;
};

/**
 * Tablet (md–lg) collapsed sidebar rail: labels / brand hide until hover.
 * Class names match `Sidebar` / `DoctorSidebar` roots (previously in `index.css`).
 */
function shellTabletRailStyles(theme: Theme) {
  const { md, lg } = theme.breakpoints.values;
  return {
    [`@media (min-width: ${md}px) and (max-width: ${lg - 1}px)`]: {
      ".sidebar-shell:not(:hover) .sidebar-label": {
        width: 0,
        maxWidth: 0,
        opacity: 0,
        overflow: "hidden",
      },
      ".sidebar-shell:not(:hover) .sidebar-brand": {
        width: 0,
        opacity: 0,
        overflow: "hidden",
      },
      ".sidebar-shell:not(:hover) .sidebar-brand-row": {
        justifyContent: "center",
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
      },
      ".sidebar-shell:not(:hover) .sidebar-nav-link": {
        justifyContent: "center",
        gap: 0,
        paddingLeft: theme.spacing(1.25),
        paddingRight: theme.spacing(1.25),
      },
      ".doctor-sidebar-shell:not(:hover) .doctor-sidebar-label": {
        width: 0,
        maxWidth: 0,
        opacity: 0,
        overflow: "hidden",
      },
      ".doctor-sidebar-shell:not(:hover) .doctor-sidebar-brand": {
        width: 0,
        opacity: 0,
        overflow: "hidden",
      },
      ".doctor-sidebar-shell:not(:hover) .doctor-sidebar-brand-row": {
        justifyContent: "center",
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
      },
      ".doctor-sidebar-shell:not(:hover) .doctor-sidebar-nav-link": {
        justifyContent: "center",
        gap: 0,
        paddingLeft: theme.spacing(1.25),
        paddingRight: theme.spacing(1.25),
      },
    },
  };
}

/**
 * App-wide MUI theme + CssBaseline. Keep in sync with test helpers in
 * `src/test-utils/renderWithProviders.tsx`.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const { mode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={(theme) => shellTabletRailStyles(theme)} />
      {children}
    </ThemeProvider>
  );
}
