import { Navigate, useLocation } from "react-router-dom";
import { paths } from "../router/paths";

/** Legacy `/signup` → landing with create-account selected. */
export default function SignupPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("auth", "signup");
  return <Navigate to={`${paths.root}?${params.toString()}`} replace />;
}
