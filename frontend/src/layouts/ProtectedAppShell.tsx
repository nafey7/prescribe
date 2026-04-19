import { useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequireAuth from "../components/RequireAuth";
import { IdentityProvider, useIdentity } from "../contexts/IdentityContext";
import { PatientProvider } from "../contexts/PatientContext";
import { rolePortalRedirectPath } from "../router/rolePortalRedirect";

/**
 * Authenticated / dev-bypass shell: identity, patient list, and role-based redirects.
 */
export default function ProtectedAppShell() {
  return (
    <RequireAuth>
      <IdentityProvider>
        <PatientProvider>
          <IdentityRedirectBoundary />
          <Outlet />
        </PatientProvider>
      </IdentityProvider>
    </RequireAuth>
  );
}

function IdentityRedirectBoundary() {
  const { currentRole } = useIdentity();
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const next = rolePortalRedirectPath(currentRole, location.pathname);
    if (next) navigate(next, { replace: true });
  }, [currentRole, location.pathname, navigate]);

  return <Outlet />;
}
