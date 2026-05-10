import type { FitnessPlanPayload } from "./fitnessPlan";
import type { MealPlanPayload } from "./mealPlan";

export type ThinkingPhase = "thinking" | "web_search" | "records" | "tool" | "meal_plan" | "fitness_plan";

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
  /** Structured message type — "text" (default), "meal_plan", or "fitness_plan". */
  message_type?: string;
  /** Present when message_type === "meal_plan". */
  meal_plan?: MealPlanPayload | null;
  /** Present when message_type === "fitness_plan". */
  fitness_plan?: FitnessPlanPayload | null;
}

export interface ChatResponse {
  message: string;
  chat_id: string;
  message_id: string;
  chat_title?: string | null;
  message_type?: string;
  meal_plan?: MealPlanPayload | null;
  fitness_plan?: FitnessPlanPayload | null;
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
