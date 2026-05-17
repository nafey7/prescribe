import { apiFetch, getApiBase, getCurrentAccessToken } from "./client";
import type {
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
    const token = getCurrentAccessToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    } else {
      xhr.setRequestHeader("X-Patient-Id", patientId);
    }

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
