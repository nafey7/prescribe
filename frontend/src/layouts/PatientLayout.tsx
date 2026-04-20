import Box from "@mui/material/Box";
import { useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import DevIdentityBanner from "../components/DevIdentityBanner";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MainContent from "../layout/MainContent";
import { paths } from "../router/paths";

export default function PatientLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isChat = !!useMatch({ path: paths.patient.chat, end: true });

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
        <Sidebar
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <Box
          sx={{
            display: "flex",
            minHeight: 0,
            minWidth: 0,
            flex: 1,
            flexDirection: "column",
          }}
        >
          <Header onMenuClick={() => setMobileNavOpen(true)} />
          <Box
            component="main"
            sx={{
              minHeight: 0,
              flex: 1,
              ...(isChat
                ? {
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    bgcolor: "background.default",
                  }
                : {
                    overflowY: "auto",
                    bgcolor: "background.default",
                    py: 3,
                  }),
            }}
          >
            {isChat ? <Outlet /> : (
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
