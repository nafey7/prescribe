import { Outlet } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";

/**
 * Global auth session (tokens, `/me` bootstrap, refresh coordinator). Nested routes
 * add `RequireAuth` + identity providers where needed.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
