export type SuggestionCategory =
  | "condition"
  | "allergy"
  | "medication"
  | "lab_result";

export type SuggestionStatus = "pending" | "accepted" | "rejected" | "expired";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface Suggestion {
  suggestion_id: string;
  patient_id: string;
  document_id: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  confidence: ConfidenceLevel;
  extracted_data: Record<string, unknown>;
  source_text: string;
  duplicate_of: string | null;
  created_at: string;
}

export interface SuggestionListResponse {
  suggestions: Suggestion[];
  total: number;
  pending_count: number;
}
