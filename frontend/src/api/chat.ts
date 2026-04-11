import type { ChatHistoryResponse, ChatResponse, Patient } from "../types/chat";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }

  return res.json();
}

export async function sendMessage(
  message: string,
  patientId: string,
  chatId?: string
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({
      message,
      patient_id: patientId,
      chat_id: chatId,
    }),
  });
}

export async function sendMessageStream(
  message: string,
  patientId: string,
  chatId: string | undefined,
  callbacks: {
    onThinking: (status: string) => void;
    onToken: (token: string) => void;
    onDone: (chatId: string, messageId: string) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      patient_id: patientId,
      chat_id: chatId,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    callbacks.onError(body.detail || `Request failed (${res.status})`);
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          switch (currentEvent) {
            case "thinking":
              callbacks.onThinking(data.status);
              break;
            case "token":
              callbacks.onToken(data.content);
              break;
            case "done":
              callbacks.onDone(data.chat_id, data.message_id);
              break;
            case "error":
              callbacks.onError(data.detail);
              break;
          }
        } catch {
          // skip malformed JSON lines
        }
        currentEvent = "";
      }
    }
  }
}

export async function getChatHistory(
  chatId: string
): Promise<ChatHistoryResponse> {
  return request<ChatHistoryResponse>(`/chat/history/${chatId}`);
}

export async function getPatients(): Promise<Patient[]> {
  return request<Patient[]>("/chat/patients");
}
