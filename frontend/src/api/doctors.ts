import type { DocumentListResponse } from "../types/document";
import type { MedicalHistory, PatientProfile } from "../types/patient";
import type {
  ConnectedPatientListResponse,
  DoctorCreateRequest,
  DoctorDashboardResponse,
  DoctorInfo,
  DoctorListResponse,
  DoctorProfile,
  DoctorUpdateRequest,
} from "../types/doctor";
import { apiFetch, apiRequest, getApiBase } from "./client";

export async function getDoctorsForDev(): Promise<DoctorInfo[]> {
  return apiRequest<DoctorInfo[]>("/doctors/for-dev", { skipPatientHeader: true });
}

export async function registerDoctor(
  data: DoctorCreateRequest
): Promise<DoctorProfile> {
  return apiRequest<DoctorProfile>("/doctors", {
    method: "POST",
    body: JSON.stringify(data),
    skipPatientHeader: true,
  });
}

export async function listDoctors(
  skip = 0,
  limit = 50
): Promise<DoctorListResponse> {
  const q = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  return apiRequest<DoctorListResponse>(`/doctors?${q.toString()}`, {
    skipPatientHeader: true,
  });
}

export async function getDoctor(doctorId: string): Promise<DoctorProfile> {
  return apiRequest<DoctorProfile>(
    `/doctors/${encodeURIComponent(doctorId)}`
  );
}

export async function updateDoctor(
  doctorId: string,
  data: DoctorUpdateRequest
): Promise<DoctorProfile> {
  return apiRequest<DoctorProfile>(
    `/doctors/${encodeURIComponent(doctorId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function getDoctorDashboard(
  doctorId: string
): Promise<DoctorDashboardResponse> {
  return apiRequest<DoctorDashboardResponse>(
    `/doctors/${encodeURIComponent(doctorId)}/dashboard`
  );
}

export async function getConnectedPatients(
  doctorId: string,
  options?: {
    search?: string;
    sort?: "recent" | "name" | "last_visit";
    skip?: number;
    limit?: number;
  }
): Promise<ConnectedPatientListResponse> {
  const q = new URLSearchParams();
  if (options?.search) q.set("search", options.search);
  if (options?.sort) q.set("sort", options.sort);
  if (options?.skip != null) q.set("skip", String(options.skip));
  if (options?.limit != null) q.set("limit", String(options.limit));
  const qs = q.toString();
  const path = `/doctors/${encodeURIComponent(doctorId)}/patients${qs ? `?${qs}` : ""}`;
  return apiRequest<ConnectedPatientListResponse>(path);
}

export async function getConnectedPatientProfile(
  doctorId: string,
  patientId: string
): Promise<PatientProfile> {
  return apiRequest<PatientProfile>(
    `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/profile`
  );
}

export async function getConnectedPatientHistory(
  doctorId: string,
  patientId: string
): Promise<MedicalHistory> {
  return apiRequest<MedicalHistory>(
    `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/medical-history`
  );
}

export async function listConnectedPatientDocuments(
  doctorId: string,
  patientId: string,
  options?: { category?: string; page?: number; pageSize?: number }
): Promise<DocumentListResponse> {
  const q = new URLSearchParams();
  if (options?.category && options.category !== "all") {
    q.set("category", options.category);
  }
  if (options?.page != null) q.set("page", String(options.page));
  if (options?.pageSize != null) q.set("page_size", String(options.pageSize));
  const qs = q.toString();
  const path = `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/documents${qs ? `?${qs}` : ""}`;
  return apiRequest<DocumentListResponse>(path);
}

export function getConnectedPatientDocumentUrl(
  doctorId: string,
  patientId: string,
  documentId: string
): string {
  const base = getApiBase().replace(/\/$/, "");
  return `${base}/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`;
}

export async function fetchConnectedPatientDocumentBlob(
  doctorId: string,
  patientId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch(
    `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.blob();
}
