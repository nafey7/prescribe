export type ClinicalNoteType = "encounter_note" | "after_visit_summary";
export type ClinicalNoteCorrectionStatus = "open" | "resolved";

export interface ClinicalNoteCorrection {
  correction_id: string;
  note_id: string;
  patient_id: string;
  doctor_id: string;
  comment: string;
  status: ClinicalNoteCorrectionStatus;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface ClinicalNote {
  note_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_display_name: string | null;
  note_type: ClinicalNoteType;
  title: string;
  content: string;
  encounter_date: string;
  published_at: string;
  updated_at: string;
  correction_request: ClinicalNoteCorrection | null;
}

export interface ClinicalNoteListResponse {
  notes: ClinicalNote[];
  total: number;
  skip: number;
  limit: number;
}

export interface ClinicalNoteDraft {
  title: string;
  content: string;
}

export interface ClinicalNoteGenerateRequest {
  note_type: ClinicalNoteType;
  encounter_date: string;
  clinician_context: string;
}

export interface ClinicalNoteCreateRequest {
  note_type: ClinicalNoteType;
  encounter_date: string;
  title: string;
  content: string;
}
