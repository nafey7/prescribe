import { FileQuestion, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteDocument, fetchDocumentBlob } from "../api/documents";
import CategoryFilter from "../components/documents/CategoryFilter";
import DocumentCard from "../components/documents/DocumentCard";
import DocumentPagination from "../components/documents/DocumentPagination";
import DocumentPreview from "../components/documents/DocumentPreview";
import UploadModal from "../components/documents/UploadModal";
import { usePatientContext } from "../contexts/PatientContext";
import { useDocuments } from "../hooks/useDocuments";
import type { DocumentMetadata } from "../types/document";

export default function DocumentsPage() {
  const { currentPatientId } = usePatientContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, error, refresh } = useDocuments(currentPatientId, {
    category,
    page,
    pageSize: 20,
  });

  const docParam = searchParams.get("doc");

  const findDoc = useCallback(
    (id: string) => data?.documents.find((d) => d.document_id === id),
    [data?.documents]
  );

  useEffect(() => {
    if (!docParam || !data) return;
    const d = findDoc(docParam);
    if (d) setPreviewDoc(d);
  }, [docParam, data, findDoc]);

  const openPreview = useCallback(
    (d: DocumentMetadata) => {
      setPreviewDoc(d);
      const next = new URLSearchParams(searchParams);
      next.set("doc", d.document_id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const closePreview = useCallback(() => {
    setPreviewDoc(null);
    const next = new URLSearchParams(searchParams);
    next.delete("doc");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDownload = useCallback(
    async (d: DocumentMetadata) => {
      try {
        const blob = await fetchDocumentBlob(currentPatientId, d.document_id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = d.filename || "document";
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setToast("Download failed.");
        window.setTimeout(() => setToast(null), 4000);
      }
    },
    [currentPatientId]
  );

  const handleDelete = useCallback(
    async (d: DocumentMetadata) => {
      if (
        !window.confirm(
          `Delete “${d.filename}”? This cannot be undone.`
        )
      ) {
        return;
      }
      try {
        await deleteDocument(currentPatientId, d.document_id);
        if (previewDoc?.document_id === d.document_id) closePreview();
        setToast("Document deleted.");
        window.setTimeout(() => setToast(null), 4000);
        void refresh();
      } catch {
        setToast("Delete failed.");
        window.setTimeout(() => setToast(null), 4000);
      }
    },
    [currentPatientId, previewDoc, closePreview, refresh]
  );

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.page_size));
  }, [data]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload and manage medical files for the selected patient.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Upload
        </button>
      </div>

      <div>

          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Filter by category
            </p>
            <CategoryFilter
              value={category}
              onChange={(c) => {
                setCategory(c);
                setPage(1);
              }}
            />
          </div>

          {toast && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {toast}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-16 text-gray-500">
              <Loader2 className="animate-spin" size={32} />
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {!isLoading && !error && data && data.documents.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
              <FileQuestion
                className="mx-auto text-gray-400 mb-3"
                size={40}
                strokeWidth={1.25}
              />
              <p className="text-gray-600 text-sm">
                No documents yet. Click Upload to add a PDF or image.
              </p>
            </div>
          )}

          {!isLoading && data && data.documents.length > 0 && (
            <ul className="space-y-3">
              {data.documents.map((d) => (
                <li key={d.document_id}>
                  <DocumentCard
                    doc={d}
                    onView={() => openPreview(d)}
                    onDownload={() => void handleDownload(d)}
                    onDelete={() => void handleDelete(d)}
                  />
                </li>
              ))}
            </ul>
          )}

          {data && data.total > 0 && (
            <DocumentPagination
              page={page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
            />
          )}
      </div>

      <UploadModal
        patientId={currentPatientId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => void refresh()}
      />

      {previewDoc && (
        <DocumentPreview
          patientId={currentPatientId}
          doc={previewDoc}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
