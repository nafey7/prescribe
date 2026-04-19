import { describe, expect, it } from "vitest";
import { legacyRedirects, paths } from "../paths";

describe("paths", () => {
  it("exposes role-scoped roots", () => {
    expect(paths.root).toBe("/");
    expect(paths.patient.root).toBe("/patient");
    expect(paths.doctor.root).toBe("/doctor");
    expect(paths.admin.root).toBe("/admin");
  });

  it("builds patient sub-routes under /patient", () => {
    expect(paths.patient.profile).toBe("/patient/profile");
    expect(paths.patient.documents).toBe("/patient/documents");
    expect(paths.patient.doctors).toBe("/patient/doctors");
    expect(paths.patient.chat).toBe("/patient/chat");
    expect(paths.patient.profileLegacy("u1")).toBe("/patient/profile/u1");
  });

  it("builds doctor sub-routes under /doctor with id helpers", () => {
    expect(paths.doctor.profile).toBe("/doctor/profile");
    expect(paths.doctor.patients).toBe("/doctor/patients");
    expect(paths.doctor.connections).toBe("/doctor/connections");
    expect(paths.doctor.patientDetail("p1")).toBe("/doctor/patients/p1");
    expect(paths.doctor.patientDocuments("p1")).toBe(
      "/doctor/patients/p1/documents"
    );
    expect(paths.doctor.patientChat("p1")).toBe("/doctor/patients/p1/chat");
    expect(paths.doctor.patientPrescriptions("p1")).toBe(
      "/doctor/patients/p1/prescriptions"
    );
  });

  it("maps every legacy route to a /patient/* destination", () => {
    const map = Object.fromEntries(
      legacyRedirects.map(({ from, to }) => [from, to])
    );
    expect(map["/home"]).toBe("/patient");
    expect(map["/profile"]).toBe("/patient/profile");
    expect(map["/documents"]).toBe("/patient/documents");
    expect(map["/dashboard"]).toBe("/patient");
    expect(map["/public/chat"]).toBe("/patient/chat");
  });
});
