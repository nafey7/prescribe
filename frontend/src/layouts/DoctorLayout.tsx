import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import DevIdentityBanner from "../components/DevIdentityBanner";
import DoctorSidebar from "../components/doctor/DoctorSidebar";
import PatientContextBar from "../components/doctor/PatientContextBar";
import MainContent from "../layout/MainContent";
import { paths } from "../router/paths";

export default function DoctorLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const patientMatch = useMatch({
    path: `${paths.doctor.patients}/:patientId`,
    end: false,
  });
  const patientId = patientMatch?.params.patientId;
  const isDoctorChat = !!useMatch({
    path: `${paths.doctor.patients}/:patientId/chat`,
    end: true,
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        minHeight: 0,
        bgcolor: "background.default",
      }}
    >
      {import.meta.env.DEV ? <DevIdentityBanner /> : null}
      <Box sx={{ display: "flex", minHeight: 0, flex: 1, overflow: "hidden" }}>
        <DoctorSidebar
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <Box
          sx={{
            position: "relative",
            display: "flex",
            minHeight: 0,
            minWidth: 0,
            flex: 1,
            flexDirection: "column",
          }}
        >
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              position: "fixed",
              bottom: (theme) => theme.spacing(2),
              left: (theme) => theme.spacing(2),
              zIndex: (theme) => theme.zIndex.speedDial,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              boxShadow: 1,
              "&:hover": { bgcolor: "action.hover" },
            }}
            size="small"
          >
            <Menu size={22} aria-hidden />
          </IconButton>
          {patientId ? (
            <Box sx={{ position: "relative", zIndex: 30, flexShrink: 0 }}>
              <PatientContextBar patientId={patientId} />
            </Box>
          ) : null}
          <Box
            component="main"
            sx={{
              position: "relative",
              zIndex: 0,
              minHeight: 0,
              flex: 1,
              ...(isDoctorChat
                ? {
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }
                : {
                    overflowY: "auto",
                    py: 3,
                  }),
            }}
          >
            {isDoctorChat ? <Outlet /> : (
              <MainContent>
                <Outlet />
              </MainContent>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
