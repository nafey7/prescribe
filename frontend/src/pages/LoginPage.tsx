import { Navigate, useLocation } from "react-router-dom";
import { paths } from "../router/paths";

/** Legacy `/login` → landing with the sign-in tab selected. */
export default function LoginPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("auth", "login");
  return <Navigate to={`${paths.root}?${params.toString()}`} replace />;
}
