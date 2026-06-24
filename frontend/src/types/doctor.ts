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

export interface PreVisitBriefEvidence {
  document_count: number;
  prescription_count: number;
  finding_count: number;
  pending_finding_count: number;
}

export interface PreVisitBrief {
  summary: string;
  recent_documents: string[];
  medication_changes: string[];
  abnormal_labs: string[];
  unresolved_concerns: string[];
  generated_at: string;
  lookback_days: number;
  evidence: PreVisitBriefEvidence;
}

/** Mirrors backend `app/schemas/connection.py` → `ConnectionResponse`. */
export interface ConnectionResponse {
  connection_id: string;
  doctor_id: string;
  patient_id: string;
  status: string;
  initiated_by: string;
  initiated_at: string;
  responded_at: string | null;
  removed_at: string | null;
  removed_by: string | null;
  doctor_name: string | null;
  patient_name: string | null;
}

export interface ConnectionListResponse {
  connections: ConnectionResponse[];
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

/** Mirrors backend `app/schemas/prescription.py`. */
export type PrescriptionStatus = "ACTIVE" | "DRAFT" | "CANCELLED" | "SUPERSEDED";

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  created_by_user_id: string;
  status: PrescriptionStatus;
  diagnosis_summary: string;
  notes: string;
  medications: Medication[];
  attachments: string[];
  issued_at: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionCreateRequest {
  diagnosis_summary?: string;
  notes?: string;
  medications?: Medication[];
}

export interface PrescriptionStatusUpdateRequest {
  status: PrescriptionStatus;
}

export interface PrescriptionSuggestionRequest {
  prompt: string;
}

export interface MedicationSuggestion {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionSuggestionResponse {
  diagnosis_summary: string;
  notes: string;
  medications: MedicationSuggestion[];
}

export type InteractionSeverity = "critical" | "moderate" | "minor";

export interface DrugInteraction {
  severity: InteractionSeverity;
  title: string;
  description: string;
  implicated_drugs: string[];
}

export interface DrugInteractionCheckResponse {
  interactions: DrugInteraction[];
  checked_at: string;
}

export interface DrugInteractionCheckRequest {
  medications: Array<{ name: string; dosage: string; frequency: string }>;
}
