import { describe, expect, it } from "vitest";
import { authInterruptNavigateTo, isPublicAuthSurfacePath } from "../authLanding";
import { paths } from "../paths";

describe("isPublicAuthSurfacePath", () => {
  it("is true for /, /login, /signup", () => {
    expect(isPublicAuthSurfacePath(paths.root)).toBe(true);
    expect(isPublicAuthSurfacePath(paths.login)).toBe(true);
    expect(isPublicAuthSurfacePath(paths.signup)).toBe(true);
  });

  it("is false for protected portal paths", () => {
    expect(isPublicAuthSurfacePath(paths.patient.documents)).toBe(false);
    expect(isPublicAuthSurfacePath(paths.doctor.patients)).toBe(false);
  });
});

describe("authInterruptNavigateTo", () => {
  it("encodes pathname and search for returnUrl", () => {
    expect(authInterruptNavigateTo("/patient/documents", "?tab=a")).toBe(
      `${paths.root}?returnUrl=${encodeURIComponent("/patient/documents?tab=a")}`
    );
  });
});
