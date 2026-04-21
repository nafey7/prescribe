export type ThinkingPhase = "thinking" | "web_search" | "records" | "tool";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  messageId?: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingStatus?: string;
  /** From streaming `thinking` events; drives assistant status UI (e.g. web search label). */
  thinkingPhase?: ThinkingPhase;
}

export interface ChatResponse {
  message: string;
  chat_id: string;
  message_id: string;
  chat_title?: string | null;
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
