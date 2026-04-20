import { useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import DevIdentityBanner from "../components/DevIdentityBanner";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { paths } from "../router/paths";

export default function PatientLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isChat = !!useMatch({ path: paths.patient.chat, end: true });

  return (
    <div className="flex h-screen min-h-0 flex-col bg-gray-50">
      {import.meta.env.DEV && <DevIdentityBanner />}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setMobileNavOpen(true)} />
          <main
            className={
              isChat
                ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50"
                : "min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6"
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
