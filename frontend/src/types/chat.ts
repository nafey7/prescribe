import type { DifferentialDiagnosisPayload } from "./differentialDiagnosis";
import type { FitnessPlanPayload } from "./fitnessPlan";
import type { MealPlanPayload } from "./mealPlan";

export type ThinkingPhase =
  | "thinking"
  | "web_search"
  | "records"
  | "lab_results"
  | "documents"
  | "tool"
  | "meal_plan"
  | "fitness_plan"
  | "differential";

export interface CitationSource {
  source_id: string;
  source_type: "profile_field" | "document";
  title: string;
  detail: string;
  profile_field?: string | null;
  document_id?: string | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  /** Persisted chat row id — required for meal-plan / fitness-plan PDF / share after save. */
  messageId?: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingStatus?: string;
  /** From streaming `thinking` events; drives assistant status UI (e.g. web search label). */
  thinkingPhase?: ThinkingPhase;
  /** Structured message type — "text" (default), "meal_plan", "fitness_plan", or "differential_diagnosis". */
  message_type?: string;
  /** Present when message_type === "meal_plan". */
  meal_plan?: MealPlanPayload | null;
  /** Present when message_type === "fitness_plan". */
  fitness_plan?: FitnessPlanPayload | null;
  /** Present when message_type === "differential_diagnosis". */
  differential_diagnosis?: DifferentialDiagnosisPayload | null;
  /** Sources referenced by inline citation links in this answer. */
  citations?: CitationSource[];
}

export interface ChatResponse {
  message: string;
  chat_id: string;
  message_id: string;
  chat_title?: string | null;
  message_type?: string;
  meal_plan?: MealPlanPayload | null;
  fitness_plan?: FitnessPlanPayload | null;
  differential_diagnosis?: DifferentialDiagnosisPayload | null;
  citations?: CitationSource[];
}

export interface ChatHistoryResponse {
  chat_id: string;
  messages: Message[];
}

export interface Patient {
  id: string;
  name: string;
  file: string;
  user_id?: string | null;
}
