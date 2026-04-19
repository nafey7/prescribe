import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import type { PatientProfile } from "../types/patient";
import type { MedicalHistory } from "../types/patient";
import { baseApi } from "./baseApi";
import { patientsApi } from "./patientsApi";
import {
  registerDoctorIdGetter,
  registerPatientIdGetter,
} from "./client";

function createTestStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function headersFromFetchCall(call: Parameters<typeof fetch>): Headers {
  const [input, init] = call;
  if (input instanceof Request) {
    return input.headers;
  }
  const h = (init as RequestInit | undefined)?.headers;
  if (h instanceof Headers) return h;
  return new Headers(h as HeadersInit | undefined);
}

const minimalProfile: PatientProfile = {
  user_id: "u1",
  patient_slug: "slug",
  email: "e@example.com",
  first_name: "A",
  last_name: "B",
  date_of_birth: null,
  sex: null,
  blood_type: null,
  weight_kg: null,
  height_cm: null,
  phone: null,
  address: null,
  emergency_contact: null,
  allergies: [],
  conditions: [],
  medications: [],
  family_history: [],
  lifestyle: null,
  created_at: "",
  updated_at: "",
};

const minimalHistory: MedicalHistory = {
  patient_id: "p1",
  summary: {
    first_name: "A",
    last_name: "B",
    age: null,
    sex: null,
    blood_type: null,
    weight_kg: null,
    height_cm: null,
  },
  conditions: [],
  allergies: [],
  medications: [],
  lab_reports: [],
  medical_events: [],
  family_history: [],
  lifestyle: null,
  recent_documents: [],
};

describe("baseQuery + cache tags", () => {
  beforeEach(() => {
    registerPatientIdGetter(() => "patient-dev");
    registerDoctorIdGetter(() => "");
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    registerPatientIdGetter(() => "");
    registerDoctorIdGetter(() => "");
  });

  it("sets X-Patient-Id by default and omits it when skipPatientHeader is used", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse({}));
    const store = createTestStore();

    await store.dispatch(patientsApi.endpoints.getPatient.initiate("p1"));
    const h1 = headersFromFetchCall(vi.mocked(fetch).mock.calls[0]!);
    expect(h1.get("X-Patient-Id")).toBe("patient-dev");

    await store.dispatch(
      patientsApi.endpoints.getPatientsForChat.initiate(undefined)
    );
    const h2 = headersFromFetchCall(vi.mocked(fetch).mock.calls[1]!);
    expect(h2.get("X-Patient-Id")).toBeNull();
  });

  it("refetches medical history after updatePatient invalidates the shared Patient tag", async () => {
    const store = createTestStore();
    vi.mocked(fetch)
      .mockImplementationOnce(() => jsonResponse(minimalHistory))
      .mockImplementationOnce(() => jsonResponse(minimalProfile))
      .mockImplementationOnce(() => jsonResponse(minimalHistory));

    await store.dispatch(
      patientsApi.endpoints.getMedicalHistory.initiate("p1")
    ).unwrap();

    await store.dispatch(
      patientsApi.endpoints.updatePatient.initiate({
        patientId: "p1",
        body: { first_name: "A" },
      })
    ).unwrap();

    for (let i = 0; i < 80 && vi.mocked(fetch).mock.calls.length < 3; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(vi.mocked(fetch).mock.calls.length).toBe(3);
  });
});
