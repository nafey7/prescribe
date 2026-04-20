import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { X } from "lucide-react";
import { useMemo } from "react";
import { getDocumentDownloadUrl } from "../../api/documents";
import type { DocumentMetadata } from "../../types/document";

interface Props {
  patientId: string;
  doc: DocumentMetadata;
  onClose: () => void;
  /** When set (e.g. doctor connection-gated URL), used instead of patient document path. */
  fileUrlOverride?: string;
}

export default function DocumentPreview({
  patientId,
  doc,
  onClose,
  fileUrlOverride,
}: Props) {
  const url = useMemo(
    () =>
      fileUrlOverride?.trim() ||
      getDocumentDownloadUrl(patientId, doc.document_id),
    [patientId, doc.document_id, fileUrlOverride]
  );

  const isPdf = doc.content_type.includes("pdf");
  const isImage = doc.content_type.startsWith("image/");

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
        {isPdf && (
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
        {isImage && (
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
        {!isPdf && !isImage && (
          <Typography align="center" color="text.secondary" sx={{ p: 3 }}>
            Preview is not available for this file type. Use Download.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
