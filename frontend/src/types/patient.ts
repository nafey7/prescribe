export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Allergy {
  substance: string;
  reaction: string;
  documented_date: string;
}

export interface Condition {
  name: string;
  diagnosed_year: number | null;
  status: string;
  notes: string;
}

export interface FamilyHistoryEntry {
  relation: string;
  condition: string;
}

export interface Lifestyle {
  smoking_status: string;
  smoking_notes: string;
  alcohol: string;
  exercise: string;
  diet_notes: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  since: string | null;
}

export interface PatientProfile {
  user_id: string;
  patient_slug: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  sex: string | null;
  blood_type: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  phone: string | null;
  address: Address | null;
  emergency_contact: EmergencyContact | null;
  allergies: Allergy[];
  conditions: Condition[];
  medications: Medication[];
  family_history: FamilyHistoryEntry[];
  lifestyle: Lifestyle | null;
  created_at: string;
  updated_at: string;
}

export interface PatientCreateRequest {
  first_name: string;
  last_name: string;
  email: string;
  patient_slug?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  blood_type?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  phone?: string | null;
  address?: Address | null;
  emergency_contact?: EmergencyContact | null;
  allergies?: Allergy[];
  conditions?: Condition[];
  medications?: Medication[];
  family_history?: FamilyHistoryEntry[];
  lifestyle?: Lifestyle | null;
}

export type PatientUpdateRequest = Partial<
  Omit<PatientCreateRequest, "first_name" | "last_name" | "email">
> & {
  first_name?: string;
  last_name?: string;
  email?: string;
};

export interface PatientListResponse {
  items: PatientProfile[];
  total: number;
  skip: number;
  limit: number;
}

export interface MedicalHistoryMedication {
  name: string;
  dosage: string;
  frequency: string;
  since: string | null;
}

export interface MedicalHistoryLabResult {
  name: string;
  value: string;
  status: string;
  reference_range: string | null;
}

export interface MedicalHistoryLabReport {
  date: string;
  results: MedicalHistoryLabResult[];
}

export interface MedicalHistoryEvent {
  year: number;
  description: string;
}

export interface PatientSummary {
  first_name: string;
  last_name: string;
  age: number | null;
  sex: string | null;
  blood_type: string | null;
  weight_kg: number | null;
  height_cm: number | null;
}

export interface DocumentSummary {
  document_id: string;
  filename: string;
  category: string;
  uploaded_at: string;
}

export interface MedicalHistory {
  patient_id: string;
  summary: PatientSummary;
  conditions: Condition[];
  allergies: Allergy[];
  medications: MedicalHistoryMedication[];
  lab_reports: MedicalHistoryLabReport[];
  medical_events: MedicalHistoryEvent[];
  family_history: FamilyHistoryEntry[];
  lifestyle: Lifestyle | null;
  recent_documents: DocumentSummary[];
}
