import { describe, expect, it } from "vitest";
import { defaultPostAuthPath, safeReturnUrl } from "../postAuthPath";

describe("defaultPostAuthPath", () => {
  it("sends doctors to /doctor", () => {
    expect(defaultPostAuthPath("doctor")).toBe("/doctor");
  });

  it("sends patients to /patient", () => {
    expect(defaultPostAuthPath("patient")).toBe("/patient");
  });

  it("sends admin to root (no admin portal yet)", () => {
    expect(defaultPostAuthPath("admin")).toBe("/");
  });
});

describe("safeReturnUrl", () => {
  it("falls back to role home when raw is null/empty", () => {
    expect(safeReturnUrl(null, "patient")).toBe("/patient");
    expect(safeReturnUrl("", "doctor")).toBe("/doctor");
    expect(safeReturnUrl(undefined, "patient")).toBe("/patient");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeReturnUrl("//evil.com", "patient")).toBe("/patient");
    expect(safeReturnUrl("//evil.com/path", "doctor")).toBe("/doctor");
  });

  it("rejects absolute URLs", () => {
    expect(safeReturnUrl("https://evil.com", "patient")).toBe("/patient");
    expect(safeReturnUrl("http://localhost:5173/patient", "patient")).toBe(
      "/patient"
    );
  });

  it("rejects bare root (would bounce on the landing)", () => {
    expect(safeReturnUrl("/", "patient")).toBe("/patient");
  });

  it("preserves same-role same-origin paths", () => {
    expect(safeReturnUrl("/patient/documents", "patient")).toBe(
      "/patient/documents"
    );
    expect(safeReturnUrl("/doctor/patients/abc", "doctor")).toBe(
      "/doctor/patients/abc"
    );
  });

  it("falls back when role does not match the requested portal", () => {
    expect(safeReturnUrl("/doctor/patients/abc", "patient")).toBe("/patient");
    expect(safeReturnUrl("/patient/documents", "doctor")).toBe("/doctor");
    expect(safeReturnUrl("/admin/users", "patient")).toBe("/patient");
  });

  it("allows admin paths only for admin", () => {
    expect(safeReturnUrl("/admin/users", "admin")).toBe("/admin/users");
  });
});
