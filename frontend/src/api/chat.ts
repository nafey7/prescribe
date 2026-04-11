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

export async function getChatHistory(
  chatId: string
): Promise<ChatHistoryResponse> {
  return request<ChatHistoryResponse>(`/chat/history/${chatId}`);
}

export async function getPatients(): Promise<Patient[]> {
  return request<Patient[]>("/chat/patients");
}
