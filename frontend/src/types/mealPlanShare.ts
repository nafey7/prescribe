import type { MealPlanPayload } from "./mealPlan";

/** Wire DTOs for `/meal-plan-shares` (snake_case). */

export interface MealPlanShareResponse {
  share_id: string;
  patient_id: string;
  doctor_id: string;
  meal_plan: MealPlanPayload;
  source_chat_id: string;
  source_message_id: string;
  chat_title: string | null;
  doctor_display_name: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface MealPlanShareListItem {
  share_id: string;
  doctor_id: string;
  doctor_display_name: string | null;
  chat_title: string | null;
  created_at: string;
  summary_line: string | null;
}

export interface MealPlanShareListResponse {
  items: MealPlanShareListItem[];
  total: number;
  skip: number;
  limit: number;
}
