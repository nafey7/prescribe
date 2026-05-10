import type { FitnessPlanPayload } from "./fitnessPlan";

/** Wire DTOs for `/fitness-plan-shares` (snake_case). */

export interface FitnessPlanShareResponse {
  share_id: string;
  patient_id: string;
  doctor_id: string;
  fitness_plan: FitnessPlanPayload;
  source_chat_id: string;
  source_message_id: string;
  chat_title: string | null;
  doctor_display_name: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface FitnessPlanShareListItem {
  share_id: string;
  doctor_id: string;
  doctor_display_name: string | null;
  chat_title: string | null;
  created_at: string;
  goal_snippet: string | null;
}

export interface FitnessPlanShareListResponse {
  shares: FitnessPlanShareListItem[];
  total: number;
  skip: number;
  limit: number;
}
