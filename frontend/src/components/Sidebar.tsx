import { Activity, ClipboardList, FileText, LayoutDashboard, Stethoscope, User, Utensils, X } from "lucide-react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { matchPath, NavLink, useLocation } from "react-router-dom";
import { paths } from "../router/paths";
import ThemeToggleButton from "./ThemeToggleButton";
import { PortalSidebarBrandRow } from "../ui/PortalSidebarBrandRow";
import { SidebarNavItemButton } from "../ui/SidebarNavItemButton";

export type SidebarNavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  /** Stable E2E hook — see e2e/pages/PatientShellPage.ts. */
  testId: string;
};

export const patientNavItems: SidebarNavItem[] = [
  {
    path: paths.patient.root,
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
    testId: "nav-dashboard",
  },
  { path: paths.patient.profile, label: "My Profile", icon: User, testId: "nav-profile" },
  { path: paths.patient.documents, label: "Documents", icon: FileText, testId: "nav-documents" },
  { path: paths.patient.doctors, label: "My Doctors", icon: Stethoscope, testId: "nav-doctors" },
  { path: paths.patient.mealPlans, label: "Meal plans", icon: Utensils, testId: "nav-meal-plans" },
  { path: paths.patient.fitnessPlans, label: "Fitness plans", icon: Activity, testId: "nav-fitness-plans" },
  { path: paths.patient.clinicalNotes, label: "Clinical notes", icon: ClipboardList, testId: "nav-clinical-notes" },
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
        data-testid={item.testId}
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

      <PortalSidebarBrandRow
        className="sidebar-brand-row"
        brandTextClassName="sidebar-brand"
        accent="primary"
        title="Patient portal"
        subtitle="Health overview"
        trailing={<ThemeToggleButton />}
      />

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
      "&:not(:hover) .sidebar-label": {
        width: 0,
        maxWidth: 0,
        opacity: 0,
        overflow: "hidden",
      },
      "&:not(:hover) .sidebar-brand": {
        width: 0,
        opacity: 0,
        overflow: "hidden",
      },
      "&:not(:hover) .sidebar-brand-row": {
        justifyContent: "center",
        px: 1,
      },
      "&:not(:hover) .sidebar-nav-link": {
        justifyContent: "center",
        gap: 0,
        px: 1.25,
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
