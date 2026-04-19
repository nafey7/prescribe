import { FileQuestion, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  fetchConnectedPatientDocumentBlob,
  getConnectedPatientDocumentUrl,
} from "../../api/doctors";
import CategoryFilter from "../../components/documents/CategoryFilter";
import DocumentCard from "../../components/documents/DocumentCard";
import DocumentPagination from "../../components/documents/DocumentPagination";
import DocumentPreview from "../../components/documents/DocumentPreview";
import { useIdentity } from "../../contexts/IdentityContext";
import { useConnectedPatientDocuments } from "../../hooks/useConnectedPatientDocuments";
import type { DocumentMetadata } from "../../types/document";

export default function DoctorPatientDocumentsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentDoctorId } = useIdentity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, error } = useConnectedPatientDocuments(
    currentDoctorId,
    patientId,
    { category, page, pageSize: 20 }
  );

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
      if (!currentDoctorId || !patientId) return;
      try {
        const blob = await fetchConnectedPatientDocumentBlob(
          currentDoctorId,
          patientId,
          d.document_id
        );
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
    [currentDoctorId, patientId]
  );

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.page_size));
  }, [data]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const previewUrl =
    previewDoc && currentDoctorId && patientId
      ? getConnectedPatientDocumentUrl(
          currentDoctorId,
          patientId,
          previewDoc.document_id
        )
      : undefined;

  if (!currentDoctorId) {
    return (
      <p className="text-sm text-amber-900">
        Select a doctor in the dev identity bar to view documents.
      </p>
    );
  }

  if (!patientId) {
    return <p className="text-gray-600">Missing patient.</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Patient documents
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Read-only view of documents for this connected patient.
        </p>
      </div>

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
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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
            className="mx-auto mb-3 text-gray-400"
            size={40}
            strokeWidth={1.25}
          />
          <p className="text-sm text-gray-600">No documents for this patient.</p>
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
                readOnly
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

      {previewDoc && patientId && (
        <DocumentPreview
          patientId={patientId}
          doc={previewDoc}
          onClose={closePreview}
          fileUrlOverride={previewUrl}
        />
      )}
    </div>
  );
}
