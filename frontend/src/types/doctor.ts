/** Mirrors backend `app/schemas/doctor.py` (JSON uses snake_case). */

export interface OfficeAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: number | null;
}

export interface DoctorProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  specialization: string;
  sub_specializations: string[];
  license_number: string | null;
  license_state: string | null;
  npi_number: string | null;
  institution: string | null;
  department: string | null;
  years_of_experience: number | null;
  education: Education[];
  phone: string | null;
  office_address: OfficeAddress | null;
  accepting_new_patients: boolean;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorCreateRequest {
  first_name: string;
  last_name: string;
  email: string;
  title?: string;
  specialization: string;
  sub_specializations?: string[];
  license_number?: string | null;
  license_state?: string | null;
  npi_number?: string | null;
  institution?: string | null;
  department?: string | null;
  years_of_experience?: number | null;
  education?: Education[];
  phone?: string | null;
  office_address?: OfficeAddress | null;
  accepting_new_patients?: boolean;
  bio?: string;
}

export type DoctorUpdateRequest = Partial<
  Omit<DoctorCreateRequest, "email">
> & { email?: string };

export interface DoctorListResponse {
  doctors: DoctorProfile[];
  total: number;
  skip: number;
  limit: number;
}

/** Lightweight row for dev identity picker (`GET /api/doctors/for-dev`). */
export interface DoctorInfo {
  id: string;
  name: string;
  specialization: string;
  institution?: string | null;
}

export interface DashboardStats {
  connected_patients: number;
  pending_requests: number;
  total_prescriptions: number;
}

export interface PendingRequestSummary {
  connection_id: string;
  patient_id: string;
  patient_name: string;
  initiated_by: string;
  initiated_at: string;
}

export interface RecentPatientSummary {
  patient_id: string;
  first_name: string;
  last_name: string;
  sex: string | null;
  age: number | null;
  last_interaction: string | null;
}

export interface RecentActivityItem {
  type: "chat" | "prescription";
  timestamp: string;
  patient_id: string;
  patient_name: string;
  summary: string;
}

export interface DoctorDashboardResponse {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  institution: string | null;
  stats: DashboardStats;
  pending_requests: PendingRequestSummary[];
  recent_patients: RecentPatientSummary[];
  recent_activity: RecentActivityItem[];
}

/** Doctor portal patient list (`GET /api/doctors/{id}/patients`). */
export interface ConnectedPatientSummary {
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  sex: string | null;
  conditions: string[];
  connected_since: string;
  last_interaction: string | null;
}

export interface ConnectedPatientListResponse {
  patients: ConnectedPatientSummary[];
  total: number;
  skip: number;
  limit: number;
}

/** Doctor–patient chat sessions (`GET .../chat/sessions`). */
export interface ChatSessionSummary {
  chat_id: string;
  patient_id: string;
  doctor_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}
