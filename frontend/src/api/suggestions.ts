import { apiFetch, apiRequest } from "./client";
import type { SuggestionListResponse } from "../types/suggestion";

export async function listSuggestions(
  patientId: string,
  options?: { status?: string; documentId?: string; category?: string }
): Promise<SuggestionListResponse> {
  const q = new URLSearchParams();
  if (options?.status) q.set("status", options.status);
  if (options?.documentId) q.set("document_id", options.documentId);
  if (options?.category) q.set("category", options.category);
  const qs = q.toString();
  const path = `/patients/${encodeURIComponent(patientId)}/suggestions${qs ? `?${qs}` : ""}`;
  return apiRequest<SuggestionListResponse>(path);
}

export async function acceptSuggestion(
  patientId: string,
  suggestionId: string
): Promise<void> {
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/suggestions/${encodeURIComponent(suggestionId)}/accept`,
    { method: "PUT" }
  );
  if (!res.ok && res.status !== 204) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
}

export async function rejectSuggestion(
  patientId: string,
  suggestionId: string
): Promise<void> {
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/suggestions/${encodeURIComponent(suggestionId)}/reject`,
    { method: "PUT" }
  );
  if (!res.ok && res.status !== 204) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
}

export async function acceptAllSuggestions(
  patientId: string,
  documentId?: string
): Promise<void> {
  const q = documentId
    ? `?document_id=${encodeURIComponent(documentId)}`
    : "";
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/suggestions/accept-all${q}`,
    { method: "POST" }
  );
  if (!res.ok && res.status !== 204) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
}

export async function rejectAllSuggestions(
  patientId: string,
  documentId?: string
): Promise<void> {
  const q = documentId
    ? `?document_id=${encodeURIComponent(documentId)}`
    : "";
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/suggestions/reject-all${q}`,
    { method: "POST" }
  );
  if (!res.ok && res.status !== 204) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
}

export async function getPendingSuggestionCount(
  patientId: string
): Promise<number> {
  const data = await listSuggestions(patientId, { status: "pending" });
  return data.pending_count;
}
