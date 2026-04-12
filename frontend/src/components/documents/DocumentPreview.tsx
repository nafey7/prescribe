import { X } from "lucide-react";
import { useMemo } from "react";
import { getDocumentDownloadUrl } from "../../api/documents";
import type { DocumentMetadata } from "../../types/document";

interface Props {
  patientId: string;
  doc: DocumentMetadata;
  onClose: () => void;
}

export default function DocumentPreview({ patientId, doc, onClose }: Props) {
  const url = useMemo(
    () => getDocumentDownloadUrl(patientId, doc.document_id),
    [patientId, doc.document_id]
  );

  const isPdf = doc.content_type.includes("pdf");
  const isImage = doc.content_type.startsWith("image/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="preview-title" className="truncate pr-4 text-lg font-semibold text-gray-900">
            {doc.description.trim() || doc.filename}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close preview"
          >
            <X size={22} />
          </button>
        </div>
        <div className="min-h-[50vh] flex-1 overflow-auto bg-gray-100 p-2">
          {isPdf && (
            <iframe
              title={doc.filename}
              src={url}
              className="h-[min(70vh,800px)] w-full rounded border-0 bg-white"
            />
          )}
          {isImage && (
            <div className="flex justify-center p-2">
              <img
                src={url}
                alt={doc.filename}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
          )}
          {!isPdf && !isImage && (
            <p className="p-6 text-center text-gray-600">
              Preview is not available for this file type. Use Download.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
