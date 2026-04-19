import { describe, expect, it } from "vitest";
import { paths } from "../paths";
import { rolePortalRedirectPath } from "../rolePortalRedirect";

describe("rolePortalRedirectPath", () => {
  it("sends doctors off patient portal paths", () => {
    expect(rolePortalRedirectPath("doctor", paths.patient.documents)).toBe(
      paths.doctor.root
    );
  });

  it("sends patients off doctor portal paths", () => {
    expect(rolePortalRedirectPath("patient", paths.doctor.patients)).toBe(
      paths.patient.root
    );
  });

  it("returns null when role matches portal", () => {
    expect(rolePortalRedirectPath("patient", paths.patient.root)).toBeNull();
    expect(rolePortalRedirectPath("doctor", paths.doctor.root)).toBeNull();
  });
});
