import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDocumentBlob } from "../../api/documents";
import type { DocumentMetadata } from "../../types/document";

interface Props {
  patientId: string;
  doc: DocumentMetadata;
  onClose: () => void;
  /** Connected-doctor views provide their connection-gated authenticated loader. */
  fetchBlobOverride?: () => Promise<Blob>;
}

export default function DocumentPreview({
  patientId,
  doc,
  onClose,
  fetchBlobOverride,
}: Props) {
  const isPdf = doc.content_type.includes("pdf");
  const isImage = doc.content_type.startsWith("image/");
  const canPreview = isPdf || isImage;
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(canPreview);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canPreview) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    setIsLoading(true);

    const load = fetchBlobOverride
      ? fetchBlobOverride()
      : fetchDocumentBlob(patientId, doc.document_id);

    void load
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error ? reason.message : "Document preview failed."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [canPreview, doc.document_id, fetchBlobOverride, patientId]);

  return (
    <Dialog
      open
      onClose={(_e, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      maxWidth="lg"
      fullWidth
      aria-labelledby="preview-title"
    >
      <DialogTitle
        id="preview-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pr: 1,
        }}
      >
        <Typography component="span" variant="h6" noWrap sx={{ pr: 1 }}>
          {doc.description.trim() || doc.filename}
        </Typography>
        <IconButton
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          edge="end"
        >
          <X size={22} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 1,
          bgcolor: "action.hover",
          minHeight: "50vh",
          overflow: "auto",
        }}
      >
        {isLoading && (
          <Stack
            spacing={1}
            sx={{ minHeight: "50vh", alignItems: "center", justifyContent: "center" }}
            aria-busy="true"
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Loading document…
            </Typography>
          </Stack>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {url && isPdf && (
          <Box
            component="iframe"
            title={doc.filename}
            src={url}
            sx={{
              width: "100%",
              height: "min(70vh, 800px)",
              border: 0,
              borderRadius: 1,
              bgcolor: "background.paper",
            }}
          />
        )}
        {url && isImage && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
            <Box
              component="img"
              src={url}
              alt={doc.filename}
              sx={{
                maxHeight: "70vh",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
        )}
        {!canPreview && (
          <Typography align="center" color="text.secondary" sx={{ p: 3 }}>
            Preview is not available for this file type. Use Download.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
