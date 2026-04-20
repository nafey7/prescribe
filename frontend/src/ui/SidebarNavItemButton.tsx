import ListItemButton, { type ListItemButtonProps } from "@mui/material/ListItemButton";
import { alpha, styled } from "@mui/material";
import type { NavLinkProps } from "react-router-dom";

export type SidebarNavItemButtonProps = ListItemButtonProps &
  Partial<NavLinkProps> & {
    /** Palette used for the selected (active route) state; does not affect unselected rows. */
    $accent?: "primary" | "secondary";
  };

/** Sidebar rail row: shared spacing/typography; `$accent` is not forwarded to the DOM. */
export const SidebarNavItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop: PropertyKey) => prop !== "$accent",
})<SidebarNavItemButtonProps>(({ theme, $accent = "primary" }) => {
  const selectedPrimary = {
    bgcolor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.dark,
    fontWeight: 600,
    "&:hover": {
      bgcolor: alpha(theme.palette.primary.main, 0.16),
    },
  };
  const selectedSecondary = {
    bgcolor: alpha(theme.palette.secondary.main, 0.12),
    color: theme.palette.secondary.dark,
    fontWeight: 600,
    "&:hover": {
      bgcolor: alpha(theme.palette.secondary.main, 0.2),
    },
  };

  return {
    // MUI ListItemButton defaults to flexGrow: 1 for use inside List; in a column
    // flex sidebar that makes every row share remaining height equally.
    flexGrow: 0,
    borderRadius: Number(theme.shape.borderRadius) * 1.5,
    py: 1.25,
    px: 1.5,
    gap: theme.spacing(1.5),
    ...theme.typography.body2,
    "&:not(.Mui-selected)": {
      color: theme.palette.text.primary,
      "&:hover": {
        bgcolor: theme.palette.action.hover,
      },
    },
    "&.Mui-selected": $accent === "secondary" ? selectedSecondary : selectedPrimary,
  };
});
