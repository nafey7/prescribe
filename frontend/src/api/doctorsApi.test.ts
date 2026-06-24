import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "./baseApi";
import {
  registerAccessTokenGetter,
  registerDoctorIdGetter,
  registerPatientIdGetter,
} from "./client";
import { doctorsApi } from "./doctorsApi";

function createTestStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
}

describe("doctorsApi pre-visit brief", () => {
  beforeEach(() => {
    registerAccessTokenGetter(() => "");
    registerDoctorIdGetter(() => "doctor-dev");
    registerPatientIdGetter(() => "stale-patient-dev");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: "No recent changes.",
          recent_documents: [],
          medication_changes: [],
          abnormal_labs: [],
          unresolved_concerns: [],
          generated_at: "2026-06-24T12:00:00Z",
          lookback_days: 180,
          evidence: {
            document_count: 0,
            prescription_count: 0,
            finding_count: 0,
            pending_finding_count: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    registerAccessTokenGetter(() => "");
    registerDoctorIdGetter(() => "");
    registerPatientIdGetter(() => "");
  });

  it("posts to the patient-scoped endpoint without a stale patient header", async () => {
    const store = createTestStore();
    await store
      .dispatch(
        doctorsApi.endpoints.generatePreVisitBrief.initiate({
          doctorId: "doctor/1",
          patientId: "patient 2",
        })
      )
      .unwrap();

    const request = vi.mocked(fetch).mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(Request);
    const req = request as Request;
    expect(req.method).toBe("POST");
    expect(req.url).toContain(
      "/doctors/doctor%2F1/patients/patient%202/pre-visit-brief"
    );
    expect(req.headers.get("X-Patient-Id")).toBeNull();
  });
});
