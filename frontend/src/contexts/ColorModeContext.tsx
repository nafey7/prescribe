import type { PaletteMode } from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const COLOR_MODE_STORAGE_KEY = "prescribe-color-mode";

function readStoredMode(): PaletteMode {
  if (typeof window === "undefined") return "dark";
  try {
    const v = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

function syncDocumentMode(mode: PaletteMode) {
  if (typeof document === "undefined") return;
  document.documentElement.style.colorScheme = mode;
  document.documentElement.setAttribute("data-color-mode", mode);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    mode === "dark" ? "#0d1117" : "#f9fafb"
  );
}

type ColorModeContextValue = {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PaletteMode>(() => readStoredMode());

  const setMode = useCallback((next: PaletteMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    syncDocumentMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: PaletteMode = prev === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      syncDocumentMode(next);
      return next;
    });
  }, []);

  useEffect(() => {
    syncDocumentMode(mode);
  }, [mode]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== COLOR_MODE_STORAGE_KEY) return;
      if (e.newValue === "light" || e.newValue === "dark") {
        setModeState(e.newValue);
        syncDocumentMode(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode]
  );

  return (
    <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within ColorModeProvider");
  }
  return ctx;
}
