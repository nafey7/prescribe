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
}

export interface DocumentUpdateRequest {
  category?: string;
  description?: string;
  tags?: string[];
}
