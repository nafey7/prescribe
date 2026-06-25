export type DocumentCategory =
  | "lab_result"
  | "imaging"
  | "prescription"
  | "clinical_note"
  | "insurance"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lab_result: "Lab results",
  imaging: "Imaging",
  prescription: "Prescriptions",
  clinical_note: "Clinical notes",
  insurance: "Insurance",
  other: "Other",
};

export type LabAnalysisStatus =
  | "not_applicable"
  | "not_requested"
  | "disabled"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type LabMetricStatus =
  | "critical"
  | "high"
  | "low"
  | "abnormal"
  | "normal"
  | "unknown";

export interface LabMetric {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: LabMetricStatus;
  classification_basis:
    | "report_flag"
    | "reference_range"
    | "explicit_text"
    | "unknown";
  explanation: string;
  source_text: string;
  confidence: "high" | "medium" | "low";
}

export interface LabReportAnalysis {
  summary: string;
  normal_summary: string;
  abnormal_summary: string;
  next_steps: string;
  report_date: string | null;
  metrics: LabMetric[];
  limitations: string[];
  critical_count: number;
  abnormal_count: number;
  normal_count: number;
  unknown_count: number;
  disclaimer: string;
}

export interface LabAnalysisResponse {
  document_id: string;
  status: LabAnalysisStatus;
  analysis: LabReportAnalysis | null;
  error: string | null;
  analyzed_at: string | null;
}

export interface DocumentMetadata {
  document_id: string;
  patient_id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  category: DocumentCategory | string;
  description: string;
  tags: string[];
  uploaded_at: string;
  updated_at: string;
  analysis_status: LabAnalysisStatus;
  analyzed_at: string | null;
}

export interface DocumentListResponse {
  documents: DocumentMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  category: string;
  description: string;
  uploaded_at: string;
  analysis_status: LabAnalysisStatus;
}

export interface DocumentUpdateRequest {
  category?: string;
  description?: string;
  tags?: string[];
}
