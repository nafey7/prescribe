import { paths } from "./paths";

/**
 * When the user's portal role does not match the URL namespace, return the path
 * to `Navigate` to (replace). Otherwise `null`.
 */
export function rolePortalRedirectPath(
  role: "patient" | "doctor",
  pathname: string
): string | null {
  const onDoctorPortal =
    pathname === paths.doctor.root ||
    pathname.startsWith(`${paths.doctor.root}/`);
  if (
    role === "doctor" &&
    !onDoctorPortal &&
    !pathname.startsWith("/public")
  ) {
    return paths.doctor.root;
  }
  if (role === "patient" && onDoctorPortal) {
    return paths.patient.root;
  }
  return null;
}
