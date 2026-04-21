import IconButton from "@mui/material/IconButton";
import { Moon, Sun } from "lucide-react";
import { useColorMode } from "../contexts/ColorModeContext";

/**
 * Switches light/dark appearance; persists via `ColorModeProvider` + `localStorage`.
 */
export default function ThemeToggleButton() {
  const { mode, toggleMode } = useColorMode();
  const isDark = mode === "dark";

  return (
    <IconButton
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      size="small"
      color="inherit"
      sx={{ color: "text.primary" }}
    >
      {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </IconButton>
  );
}
