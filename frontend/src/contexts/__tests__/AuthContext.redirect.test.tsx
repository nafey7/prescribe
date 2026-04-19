/**
 * Auth interrupt redirect targets — logic lives in `router/authLanding.ts`
 * (used by AuthContext.navigateToLoginWithReturn).
 */
import { describe, expect, it } from "vitest";
import {
  authInterruptNavigateTo,
  isPublicAuthSurfacePath,
} from "../../router/authLanding";
import { paths } from "../../router/paths";

describe("Auth interrupt redirect (auth landing paths)", () => {
  it("does not navigate when already on a public auth surface", () => {
    expect(isPublicAuthSurfacePath(paths.root)).toBe(true);
    expect(isPublicAuthSurfacePath(paths.login)).toBe(true);
    expect(isPublicAuthSurfacePath(paths.signup)).toBe(true);
  });

  it("navigates with returnUrl when on a protected path", () => {
    expect(isPublicAuthSurfacePath(paths.patient.chat)).toBe(false);
    expect(authInterruptNavigateTo(paths.patient.chat, "")).toBe(
      `${paths.root}?returnUrl=${encodeURIComponent(paths.patient.chat)}`
    );
  });
});
