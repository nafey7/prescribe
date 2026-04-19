import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  applyPrescribeHeaders,
  registerDoctorIdGetter,
  registerPatientIdGetter,
} from "./client";

describe("applyPrescribeHeaders", () => {
  beforeEach(() => {
    registerPatientIdGetter(() => "pat-1");
    registerDoctorIdGetter(() => "doc-9");
  });

  afterEach(() => {
    registerPatientIdGetter(() => "");
    registerDoctorIdGetter(() => "");
  });

  it("adds X-Patient-Id and X-Doctor-Id from registered getters", () => {
    const h = applyPrescribeHeaders(new Headers());
    expect(h.get("X-Patient-Id")).toBe("pat-1");
    expect(h.get("X-Doctor-Id")).toBe("doc-9");
  });

  it("omits X-Patient-Id when skipPatientHeader is true", () => {
    const h = applyPrescribeHeaders(new Headers(), { skipPatientHeader: true });
    expect(h.get("X-Patient-Id")).toBeNull();
    expect(h.get("X-Doctor-Id")).toBe("doc-9");
  });

  it("sets Content-Type for string bodies when not already set", () => {
    const h = applyPrescribeHeaders(new Headers(), { body: "{}" });
    expect(h.get("Content-Type")).toBe("application/json");
  });

  it("does not override existing Content-Type for string bodies", () => {
    const h = new Headers({ "Content-Type": "text/plain" });
    applyPrescribeHeaders(h, { body: "{}" });
    expect(h.get("Content-Type")).toBe("text/plain");
  });
});
