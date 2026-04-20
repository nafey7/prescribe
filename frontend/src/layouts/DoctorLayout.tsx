import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import DevIdentityBanner from "../components/DevIdentityBanner";
import DoctorSidebar from "../components/doctor/DoctorSidebar";
import PatientContextBar from "../components/doctor/PatientContextBar";
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
    <div className="flex h-screen min-h-0 flex-col bg-gray-50">
      {import.meta.env.DEV && <DevIdentityBanner />}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DoctorSidebar
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <button
            type="button"
            className="fixed bottom-4 left-4 z-40 rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm hover:bg-gray-50 md:hidden"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={22} aria-hidden />
          </button>
          {patientId ? (
            <div className="relative z-30 shrink-0">
              <PatientContextBar patientId={patientId} />
            </div>
          ) : null}
          <main
            className={
              isDoctorChat
                ? "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden"
                : "relative z-0 min-h-0 flex-1 overflow-y-auto p-6"
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
