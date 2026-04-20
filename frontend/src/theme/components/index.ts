import type { Components, Theme } from "@mui/material";
import { MuiButton } from "./MuiButton";
import { MuiCssBaseline } from "./MuiCssBaseline";
import { MuiDialog } from "./MuiDialog";
import { MuiLinearProgress } from "./MuiLinearProgress";
import { MuiTypography } from "./MuiTypography";

/**
 * Merged `components` map for `createTheme`.
 *
 * TODO (later phases): add per-component files as screens migrate, e.g.
 * MuiPaper, MuiTextField, MuiAppBar, MuiDrawer, …
 * (Sidebar nav rows use `ui/SidebarNavItemButton`.)
 */
export const components: Components<Theme> = {
  MuiButton,
  MuiCssBaseline,
  MuiDialog,
  MuiLinearProgress,
  MuiTypography,
};
