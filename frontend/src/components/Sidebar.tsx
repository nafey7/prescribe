import { FileText, LayoutDashboard, Stethoscope, User, X } from "lucide-react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { matchPath, NavLink, useLocation } from "react-router-dom";
import { paths } from "../router/paths";
import { SidebarNavItemButton } from "../ui/SidebarNavItemButton";

export type SidebarNavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

export const patientNavItems: SidebarNavItem[] = [
  {
    path: paths.patient.root,
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  { path: paths.patient.profile, label: "My Profile", icon: User },
  { path: paths.patient.documents, label: "Documents", icon: FileText },
  { path: paths.patient.doctors, label: "My Doctors", icon: Stethoscope },
];

function SidebarInner({
  onClose,
  showMobileClose,
}: {
  onClose: () => void;
  showMobileClose: boolean;
}) {
  const location = useLocation();

  const items = patientNavItems.map((item) => {
    const Icon = item.icon;
    const selected = Boolean(
      matchPath({ path: item.path, end: item.end ?? false }, location.pathname)
    );
    return (
      <SidebarNavItemButton
        key={item.path}
        $accent="primary"
        component={NavLink}
        to={item.path}
        end={item.end}
        onClick={onClose}
        selected={selected}
        className="sidebar-nav-link"
      >
        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            color: "inherit",
          }}
        >
          <Icon size={20} aria-hidden />
        </Box>
        <Typography
          component="span"
          variant="body2"
          className="sidebar-label"
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: "inherit",
            color: "inherit",
          }}
          noWrap
        >
          {item.label}
        </Typography>
      </SidebarNavItemButton>
    );
  });

  return (
    <>
      {showMobileClose ? (
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            height: 56,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "flex-end",
            px: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <IconButton aria-label="Close menu" onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      ) : null}

      <Box
        className="sidebar-brand-row"
        sx={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          px: 1.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", minWidth: 0, alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              typography: "subtitle1",
              lineHeight: 1,
            }}
          >
            🩺
          </Box>
          <Box className="sidebar-brand" sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap color="text.primary" sx={{ fontWeight: 600 }}>
              Patient portal
            </Typography>
            <Typography variant="caption" noWrap color="text.secondary">
              Health overview
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        component="nav"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          overflowY: "auto",
          p: 1.5,
        }}
      >
        {items}
      </Box>
    </>
  );
}

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const asideSx = {
    willChange: "transform, width",
    display: { xs: "none", md: "flex" },
    flexDirection: "column" as const,
    flexShrink: 0,
    borderRight: 1,
    borderColor: "divider",
    bgcolor: "background.paper",
    transition: theme.transitions.create(["width", "box-shadow"], {
      duration: 200,
      easing: theme.transitions.easing.easeOut,
    }),
    [theme.breakpoints.only("md")]: {
      width: 64,
      overflowX: "hidden",
      "&:hover": {
        width: 240,
        boxShadow: theme.shadows[4],
      },
    },
    [theme.breakpoints.up("lg")]: {
      width: 240,
    },
  };

  return (
    <>
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onClose}
        variant="temporary"
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 240,
            boxSizing: "border-box",
          },
        }}
      >
        <Box
          className="sidebar-shell"
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            bgcolor: "background.paper",
          }}
        >
          <SidebarInner onClose={onClose} showMobileClose />
        </Box>
      </Drawer>

      {isMdUp ? (
        <Box component="aside" className="sidebar-shell" sx={asideSx}>
          <SidebarInner onClose={onClose} showMobileClose={false} />
        </Box>
      ) : null}
    </>
  );
}
