import { useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import DevIdentityBanner from "../components/DevIdentityBanner";
import DoctorHeader from "../components/doctor/DoctorHeader";
import DoctorSidebar from "../components/doctor/DoctorSidebar";
import PatientContextBar from "../components/doctor/PatientContextBar";
import Footer from "../components/Footer";
import { paths } from "../router/paths";

export default function DoctorLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const patientMatch = useMatch({
    path: `${paths.doctor.patients}/:patientId`,
    end: false,
  });
  const patientId = patientMatch?.params.patientId;

  return (
    <div className="flex h-screen min-h-0 flex-col bg-gray-50">
      {import.meta.env.DEV && <DevIdentityBanner />}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DoctorSidebar
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DoctorHeader onMenuClick={() => setMobileNavOpen(true)} />
          {patientId ? <PatientContextBar patientId={patientId} /> : null}
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
