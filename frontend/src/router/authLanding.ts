import { paths } from "./paths";

/** Paths where we do not send the user back through `/?returnUrl=` on auth interrupt. */
export function isPublicAuthSurfacePath(pathname: string): boolean {
  return (
    pathname === paths.root ||
    pathname === paths.login ||
    pathname === paths.signup
  );
}

export function authInterruptNavigateTo(pathname: string, search: string): string {
  return `${paths.root}?returnUrl=${encodeURIComponent(`${pathname}${search}`)}`;
}
