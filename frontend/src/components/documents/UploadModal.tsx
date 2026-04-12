import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { uploadDocument } from "../../api/documents";
import type { DocumentCategory } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";
import UploadDropzone from "./UploadDropzone";

const CATEGORIES: DocumentCategory[] = [
  "lab_result",
  "imaging",
  "prescription",
  "clinical_note",
  "insurance",
  "other",
];

interface Props {
  patientId: string;
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadModal({
  patientId,
  open,
  onClose,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setBanner(null);
      setProgress(0);
      setCategory("other");
      setDescription("");
    }
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setProgress(0);
    try {
      await uploadDocument(patientId, file, category, description, (loaded, total) => {
        if (total > 0) setProgress(Math.round((loaded / total) * 100));
      });
      setBanner("Document uploaded successfully.");
      setFile(null);
      setDescription("");
      setCategory("other");
      onUploaded();
      setTimeout(() => {
        setBanner(null);
        onClose();
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  const isPdf =
    file?.type.includes("pdf") || file?.name.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="upload-modal-title" className="text-lg font-semibold text-gray-900">
            Upload document
          </h2>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {banner && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {banner}
            </p>
          )}
          <UploadDropzone
            file={file}
            onFile={setFile}
            error={null}
            disabled={submitting}
          />
          {previewUrl && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <img
                src={previewUrl}
                alt="Selected file preview"
                className="mx-auto max-h-48 w-full object-contain"
              />
            </div>
          )}
          {file && !previewUrl && isPdf && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <FileText className="text-gray-500" size={18} />
              PDF ready to upload
            </div>
          )}
          <div>
            <label htmlFor="doc-category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="doc-desc" className="block text-sm font-medium text-gray-700">
              Description <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Lab panel from January visit"
            />
          </div>
          {submitting && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progress || 8}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Uploading…</p>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !file}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
