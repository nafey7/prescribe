import {
  LayoutDashboard,
  Link2,
  LogOut,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { matchPath, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { paths } from "../../router/paths";
import ThemeToggleButton from "../ThemeToggleButton";
import { PortalSidebarBrandRow } from "../../ui/PortalSidebarBrandRow";
import { SidebarNavItemButton } from "../../ui/SidebarNavItemButton";

export type DoctorNavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: number;
};

const defaultDoctorNavItems: DoctorNavItem[] = [
  {
    path: paths.doctor.root,
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  { path: paths.doctor.patients, label: "My Patients", icon: Users },
  {
    path: paths.doctor.connections,
    label: "Connections",
    icon: Link2,
  },
  { path: paths.doctor.profile, label: "My Profile", icon: UserCircle },
];

function DoctorSidebarInner({
  items,
  onClose,
  showMobileClose,
}: {
  items: DoctorNavItem[];
  onClose: () => void;
  showMobileClose: boolean;
}) {
  const location = useLocation();
  const { logout, status } = useAuth();

  const nav = items.map((item) => {
    const Icon = item.icon;
    const selected = Boolean(
      matchPath({ path: item.path, end: item.end ?? false }, location.pathname)
    );
    const badge =
      item.badge != null && item.badge > 0 ? (
        <Box
          component="span"
          sx={{
            ml: "auto",
            flexShrink: 0,
            px: 1,
            py: 0.25,
            borderRadius: 5,
            typography: "caption",
            fontWeight: 600,
            bgcolor: (t) => alpha(t.palette.secondary.main, 0.15),
            color: "secondary.dark",
          }}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </Box>
      ) : null;

    return (
      <SidebarNavItemButton
        key={item.path}
        $accent="secondary"
        component={NavLink}
        to={item.path}
        end={item.end}
        onClick={onClose}
        selected={selected}
        className="doctor-sidebar-nav-link"
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
          className="doctor-sidebar-label"
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
        {badge}
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
        className="doctor-sidebar-brand-row"
        brandTextClassName="doctor-sidebar-brand"
        accent="secondary"
        title="Doctor portal"
        subtitle="Clinical workspace"
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
        {nav}
      </Box>

      {status === "authenticated" ? (
        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider", p: 1.5 }}>
          <SidebarNavItemButton
            className="doctor-sidebar-nav-link"
            $accent="secondary"
            onClick={() => void logout()}
            sx={{ width: "100%" }}
          >
            <Box
              component="span"
              sx={{ display: "flex", alignItems: "center", flexShrink: 0, color: "inherit" }}
            >
              <LogOut size={20} aria-hidden />
            </Box>
            <Typography
              component="span"
              variant="body2"
              className="doctor-sidebar-label"
              sx={{ flex: 1, minWidth: 0, fontWeight: "inherit", color: "inherit" }}
              noWrap
            >
              Log out
            </Typography>
          </SidebarNavItemButton>
        </Box>
      ) : null}
    </>
  );
}

export default function DoctorSidebar({
  mobileOpen,
  onClose,
  items = defaultDoctorNavItems,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  items?: DoctorNavItem[];
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
          className="doctor-sidebar-shell"
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            bgcolor: "background.paper",
          }}
        >
          <DoctorSidebarInner
            items={items}
            onClose={onClose}
            showMobileClose
          />
        </Box>
      </Drawer>

      {isMdUp ? (
        <Box component="aside" className="doctor-sidebar-shell" sx={asideSx}>
          <DoctorSidebarInner
            items={items}
            onClose={onClose}
            showMobileClose={false}
          />
        </Box>
      ) : null}
    </>
  );
}
