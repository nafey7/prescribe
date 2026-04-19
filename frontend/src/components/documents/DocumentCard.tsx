import { FileText, ImageIcon, Trash2, Download, Eye } from "lucide-react";
import type { DocumentCategory, DocumentMetadata } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";

interface Props {
  doc: DocumentMetadata;
  onView: () => void;
  onDownload: () => void;
  /** Omit or set read-only to hide delete (e.g. doctor portal). */
  onDelete?: () => void;
  readOnly?: boolean;
}

function categoryLabel(cat: string): string {
  if (cat in DOCUMENT_CATEGORY_LABELS) {
    return DOCUMENT_CATEGORY_LABELS[cat as DocumentCategory];
  }
  return cat;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentCard({
  doc,
  onView,
  onDownload,
  onDelete,
  readOnly = false,
}: Props) {
  const isImage = doc.content_type.startsWith("image/");
  const title = doc.description.trim() || doc.filename;
  const showFilename =
    Boolean(doc.description.trim()) && doc.filename !== title;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 truncate">{title}</h3>
          {showFilename && (
            <p className="mt-0.5 text-xs text-gray-500 truncate" title={doc.filename}>
              File: {doc.filename}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {categoryLabel(doc.category)} ·{" "}
            {doc.content_type.includes("pdf") ? "PDF" : doc.content_type}{" "}
            · {formatBytes(doc.file_size_bytes)}
          </p>
          {doc.uploaded_at && (
            <p className="mt-0.5 text-xs text-gray-400">
              Uploaded: {doc.uploaded_at}
              {doc.updated_at && doc.updated_at !== doc.uploaded_at && (
                <> · Updated: {doc.updated_at}</>
              )}
            </p>
          )}
          {doc.tags && doc.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {doc.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onView}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Eye size={14} />
              View
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={14} />
              Download
            </button>
            {!readOnly && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
