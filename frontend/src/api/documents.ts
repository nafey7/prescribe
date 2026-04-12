import { apiFetch, getApiBase } from "./client";
import type {
  DocumentListResponse,
  DocumentMetadata,
  DocumentUpdateRequest,
  DocumentUploadResponse,
} from "../types/document";

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    const d = body.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d[0] && typeof d[0] === "object" && d[0] !== null) {
      const msg = (d[0] as { msg?: string }).msg;
      if (msg) return msg;
    }
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

export function getDocumentDownloadUrl(
  patientId: string,
  documentId: string
): string {
  const base = getApiBase().replace(/\/$/, "");
  return `${base}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`;
}

/** Alias matching the feature plan name; same URL as {@link getDocumentDownloadUrl}. */
export const getDocumentUrl = getDocumentDownloadUrl;

export async function uploadDocument(
  patientId: string,
  file: File,
  category: string,
  description: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<DocumentUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("description", description);

    const url = `${getApiBase()}/patients/${encodeURIComponent(patientId)}/documents`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("X-Patient-Id", patientId);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(ev.loaded, ev.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as DocumentUploadResponse);
        } catch {
          reject(new Error("Invalid response"));
        }
      } else {
        const text = xhr.responseText || "";
        try {
          const body = JSON.parse(text) as { detail?: string };
          reject(new Error(body.detail || `Request failed (${xhr.status})`));
        } catch {
          reject(new Error(`Request failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export async function listDocuments(
  patientId: string,
  options?: { category?: string; page?: number; pageSize?: number }
): Promise<DocumentListResponse> {
  const q = new URLSearchParams();
  if (options?.category && options.category !== "all") {
    q.set("category", options.category);
  }
  if (options?.page != null) q.set("page", String(options.page));
  if (options?.pageSize != null) q.set("page_size", String(options.pageSize));
  const qs = q.toString();
  const path = `/patients/${encodeURIComponent(patientId)}/documents${qs ? `?${qs}` : ""}`;
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<DocumentListResponse>;
}

export async function deleteDocument(
  patientId: string,
  documentId: string
): Promise<void> {
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseError(res));
  }
}

export async function updateDocumentMetadata(
  patientId: string,
  documentId: string,
  data: DocumentUpdateRequest
): Promise<DocumentMetadata> {
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<DocumentMetadata>;
}

export async function fetchDocumentBlob(
  patientId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.blob();
}
