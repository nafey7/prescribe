import { apiFetch, apiRequest } from "./client";
import type { ChatHistoryResponse, ChatResponse, Patient } from "../types/chat";

export async function sendMessage(
  message: string,
  chatId?: string
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({
      message,
      chat_id: chatId,
    }),
  });
}

export async function sendMessageStream(
  message: string,
  chatId: string | undefined,
  callbacks: {
    onThinking: (status: string) => void;
    onToken: (token: string) => void;
    onDone: (chatId: string, messageId: string) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const res = await apiFetch("/chat/message/stream", {
    method: "POST",
    body: JSON.stringify({
      message,
      chat_id: chatId,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    callbacks.onError(body.detail || `Request failed (${res.status})`);
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line === "") {
        currentEvent = "";
      } else if (line.startsWith("event: ")) {
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
  return apiRequest<ChatHistoryResponse>(`/chat/history/${chatId}`);
}

/** Chat-oriented list (same data as legacy GET /chat/patients). */
export async function getPatients(): Promise<Patient[]> {
  return apiRequest<Patient[]>("/patients/for-chat", {
    skipPatientHeader: true,
  });
}
