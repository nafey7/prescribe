import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { IdentityProvider, useIdentity } from "../contexts/IdentityContext";
import { PatientProvider } from "../contexts/PatientContext";

/**
 * Wraps portal routes with identity + patient providers. Must sit under `RouterProvider`
 * so `IdentityProvider` can call `useNavigate` for role switches.
 */
export default function RootLayout() {
  return (
    <IdentityProvider>
      <PatientProvider>
        <IdentityRedirectBoundary />
      </PatientProvider>
    </IdentityProvider>
  );
}

function IdentityRedirectBoundary() {
  const { currentRole } = useIdentity();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    if (
      currentRole === "doctor" &&
      !path.startsWith("/doctor") &&
      !path.startsWith("/public")
    ) {
      navigate("/doctor", { replace: true });
    } else if (currentRole === "patient" && path.startsWith("/doctor")) {
      navigate("/", { replace: true });
    }
  }, [currentRole, location.pathname, navigate]);

  return <Outlet />;
}
