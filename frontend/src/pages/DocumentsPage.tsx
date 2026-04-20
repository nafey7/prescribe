import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FileQuestion } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDeleteDocumentMutation } from "../api/documentsApi";
import { fetchDocumentBlob } from "../api/documents";
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

  const { data, isLoading, error } = useDocuments(currentPatientId, {
    category,
    page,
    pageSize: 20,
  });
  const [deleteDocument] = useDeleteDocumentMutation();

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
        await deleteDocument({
          patientId: currentPatientId,
          documentId: d.document_id,
        }).unwrap();
        if (previewDoc?.document_id === d.document_id) closePreview();
        setToast("Document deleted.");
        window.setTimeout(() => setToast(null), 4000);
      } catch {
        setToast("Delete failed.");
        window.setTimeout(() => setToast(null), 4000);
      }
    },
    [currentPatientId, previewDoc, closePreview, deleteDocument]
  );

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.page_size));
  }, [data]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { xs: "stretch", sm: "flex-end" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Upload and manage medical files for the selected patient.
            </Typography>
          </Box>
          <Button
            type="button"
            variant="contained"
            color="success"
            onClick={() => setUploadOpen(true)}
            sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
          >
            Upload
          </Button>
        </Stack>

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
          <Alert severity="success" onClose={() => setToast(null)}>
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
              No documents yet. Click Upload to add a PDF or image.
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
                  onDelete={() => void handleDelete(d)}
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

      <UploadModal
        patientId={currentPatientId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />

      {previewDoc && (
        <DocumentPreview
          patientId={currentPatientId}
          doc={previewDoc}
          onClose={closePreview}
        />
      )}
    </>
  );
}
