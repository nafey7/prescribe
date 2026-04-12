import type {
  MedicalHistory,
  PatientCreateRequest,
  PatientListResponse,
  PatientProfile,
  PatientUpdateRequest,
} from "../types/patient";
import { apiRequest } from "./client";

export async function registerPatient(
  data: PatientCreateRequest
): Promise<PatientProfile> {
  return apiRequest<PatientProfile>("/patients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPatient(patientId: string): Promise<PatientProfile> {
  return apiRequest<PatientProfile>(
    `/patients/${encodeURIComponent(patientId)}`
  );
}

export async function updatePatient(
  patientId: string,
  data: PatientUpdateRequest
): Promise<PatientProfile> {
  return apiRequest<PatientProfile>(
    `/patients/${encodeURIComponent(patientId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function listPatients(
  skip = 0,
  limit = 200
): Promise<PatientListResponse> {
  const q = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  return apiRequest<PatientListResponse>(`/patients?${q.toString()}`);
}

export async function getMedicalHistory(
  patientId: string
): Promise<MedicalHistory> {
  return apiRequest<MedicalHistory>(
    `/patients/${encodeURIComponent(patientId)}/medical-history`
  );
}
