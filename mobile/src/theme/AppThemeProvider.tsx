import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PaperProvider } from "react-native-paper";

import { darkTheme, lightTheme, type AppTheme } from "./theme";

type ThemeMode = "light" | "dark";

type AppThemeContextValue = {
  isDark: boolean;
  mode: ThemeMode;
  theme: AppTheme;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const theme = mode === "dark" ? darkTheme : lightTheme;

  const value = useMemo<AppThemeContextValue>(
    () => ({
      isDark: mode === "dark",
      mode,
      theme,
      toggleTheme: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode, theme]
  );

  return (
    <AppThemeContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
