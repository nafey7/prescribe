export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  messageId?: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingStatus?: string;
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
