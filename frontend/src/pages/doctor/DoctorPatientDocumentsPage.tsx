import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FileQuestion } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  fetchConnectedPatientDocumentBlob,
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

  const previewBlobLoader = useMemo(() => {
    if (!previewDoc || !currentDoctorId || !patientId) return undefined;
    return () =>
      fetchConnectedPatientDocumentBlob(
        currentDoctorId,
        patientId,
        previewDoc.document_id
      );
  }, [currentDoctorId, patientId, previewDoc]);

  if (!currentDoctorId) {
    return (
      <Typography variant="body2" sx={{ color: "warning.dark" }}>
        Select a doctor in the dev identity bar to view documents.
      </Typography>
    );
  }

  if (!patientId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Missing patient.
      </Typography>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Patient documents
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Read-only view of documents for this connected patient.
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mb: 1,
              display: "block",
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            Filter by category
          </Typography>
          <CategoryFilter
            value={category}
            onChange={(c) => {
              setCategory(c);
              setPage(1);
            }}
          />
        </Box>

        {toast && (
          <Alert severity="warning" onClose={() => setToast(null)}>
            {toast}
          </Alert>
        )}

      {isLoading && (
        <Stack sx={{ alignItems: "center", py: 8 }} aria-busy="true">
          <CircularProgress />
        </Stack>
      )}

        {error && !isLoading && (
          <Alert severity="error">{error}</Alert>
        )}

        {!isLoading && !error && data && data.documents.length === 0 && (
          <Box
            sx={{
              borderRadius: 2,
              border: 1,
              borderStyle: "dashed",
              borderColor: "divider",
              bgcolor: "background.paper",
              py: 8,
              textAlign: "center",
            }}
          >
            <Box sx={{ color: "text.disabled", display: "flex", justifyContent: "center", mb: 1.5 }}>
              <FileQuestion size={40} strokeWidth={1.25} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              No documents for this patient.
            </Typography>
          </Box>
        )}

        {!isLoading && data && data.documents.length > 0 && (
          <Stack component="ul" spacing={1.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
            {data.documents.map((d) => (
              <Box component="li" key={d.document_id}>
                <DocumentCard
                  doc={d}
                  onView={() => openPreview(d)}
                  onDownload={() => void handleDownload(d)}
                  readOnly
                />
              </Box>
            ))}
          </Stack>
        )}

        {data && data.total > 0 && (
          <DocumentPagination
            page={page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Stack>

      {previewDoc && patientId && (
        <DocumentPreview
          patientId={patientId}
          doc={previewDoc}
          onClose={closePreview}
          fetchBlobOverride={previewBlobLoader}
        />
      )}
    </>
  );
}
