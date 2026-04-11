export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  chat_id: string;
  message_id: string;
}

export interface ChatHistoryResponse {
  chat_id: string;
  messages: Message[];
}

export interface Patient {
  id: string;
  name: string;
  file: string;
}
