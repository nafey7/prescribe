import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { Menu } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePatientContext } from "../contexts/PatientContext";
import { paths } from "../router/paths";
import PatientSelector from "./PatientSelector";

const TITLES: { prefix: string; title: string }[] = [
  { prefix: paths.patient.documents, title: "Documents" },
  { prefix: paths.patient.profile, title: "My Profile" },
  { prefix: paths.patient.doctors, title: "My Doctors" },
  { prefix: paths.patient.chat, title: "Medical AI Chat" },
  { prefix: paths.patient.root, title: "Dashboard" },
];

function pageTitle(pathname: string): string {
  if (
    pathname === paths.patient.root ||
    pathname === `${paths.patient.root}/`
  ) {
    return "Dashboard";
  }
  const hit = TITLES.find((t) => pathname.startsWith(t.prefix));
  return hit?.title ?? "Portal";
}

export default function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const location = useLocation();
  const { logout, status } = useAuth();
  const { patients, currentPatientId, setCurrentPatientId } =
    usePatientContext();
  const title = useMemo(
    () => pageTitle(location.pathname),
    [location.pathname]
  );

  const patientName = useMemo(() => {
    const p = patients.find((x) => x.id === currentPatientId);
    return p?.name ?? "Patient";
  }, [patients, currentPatientId]);

  return (
    <Box
      component="header"
      sx={{
        flexShrink: 0,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        px: 2,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          mx: "auto",
          display: "flex",
          maxWidth: "72rem",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <IconButton
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          size="small"
          sx={{
            display: { xs: "inline-flex", md: "none" },
          }}
        >
          <Menu size={22} />
        </IconButton>

        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            minWidth: 0,
            maxWidth: "40%",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="body2" noWrap color="text.primary" sx={{ fontWeight: 600 }}>
            {patientName}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            sx={{
              flexShrink: 0,
              borderRadius: 10,
              px: 1,
              py: 0.25,
              fontWeight: 600,
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
              color: (theme) => theme.palette.success.dark,
            }}
          >
            Patient
          </Typography>
        </Box>

        <Typography
          component="h2"
          variant="body2"
          color="text.primary"
          sx={{
            minWidth: 0,
            flex: 1,
            textAlign: "center",
            fontWeight: 500,
          }}
          noWrap
        >
          {title}
        </Typography>

        <Box sx={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 1 }}>
          {!import.meta.env.DEV ? (
            <PatientSelector
              selectedId={currentPatientId}
              onChange={setCurrentPatientId}
            />
          ) : null}
          {status === "authenticated" ? (
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={() => void logout()}
              sx={{ typography: "caption", fontWeight: 600, px: 1.5, py: 0.5 }}
            >
              Log out
            </Button>
          ) : null}
          <IconButton
            aria-label="Notifications (coming soon)"
            disabled
            title="Coming in a later phase"
            size="small"
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              border: 1,
              borderColor: "divider",
              borderRadius: "50%",
            }}
          >
            <Typography component="span" variant="caption" aria-hidden sx={{ opacity: 0.6 }}>
              🔔
            </Typography>
          </IconButton>
          <Box
            title="Account (Phase E)"
            aria-hidden
            sx={{
              display: { xs: "none", sm: "flex" },
              width: 36,
              height: 36,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1px dashed",
              borderColor: "divider",
              bgcolor: "action.hover",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              👤
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
