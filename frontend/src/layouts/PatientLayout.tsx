import { useState } from "react";
import { Outlet } from "react-router-dom";
import DevIdentityBanner from "../components/DevIdentityBanner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function PatientLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
          <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
