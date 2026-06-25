import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Activity, FileText, ImageIcon, MessageSquare, Trash2, Download, Eye } from "lucide-react";
import type { DocumentCategory, DocumentMetadata } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";

interface Props {
  doc: DocumentMetadata;
  onView: () => void;
  onDownload: () => void;
  /** Omit or set read-only to hide delete (e.g. doctor portal). */
  onDelete?: () => void;
  /** When provided, renders a "Discuss with AI" button (lab_result documents only). */
  onDiscuss?: () => void;
  /** Opens the durable structured analysis for a lab report. */
  onAnalyze?: () => void;
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
  onDiscuss,
  onAnalyze,
  readOnly = false,
}: Props) {
  const isImage = doc.content_type.startsWith("image/");
  const title = doc.description.trim() || doc.filename;
  const showFilename =
    Boolean(doc.description.trim()) && doc.filename !== title;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Stack direction="row" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1,
              bgcolor: "action.hover",
              color: "text.secondary",
            }}
          >
            {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {showFilename && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                title={doc.filename}
                sx={{ display: "block" }}
              >
                File: {doc.filename}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {categoryLabel(doc.category)} ·{" "}
              {doc.content_type.includes("pdf") ? "PDF" : doc.content_type} ·{" "}
              {formatBytes(doc.file_size_bytes)}
            </Typography>
            {doc.uploaded_at && (
              <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
                Uploaded: {doc.uploaded_at}
                {doc.updated_at && doc.updated_at !== doc.uploaded_at && (
                  <> · Updated: {doc.updated_at}</>
                )}
              </Typography>
            )}
            {doc.category === "lab_result" && doc.analysis_status && (
              <Chip
                size="small"
                variant="outlined"
                label={
                  doc.analysis_status === "completed"
                    ? "AI analysis ready"
                    : doc.analysis_status === "processing" || doc.analysis_status === "queued"
                      ? "AI analysis in progress"
                      : doc.analysis_status === "failed"
                        ? "AI analysis needs retry"
                        : "AI analysis unavailable"
                }
                color={
                  doc.analysis_status === "completed"
                    ? "success"
                    : doc.analysis_status === "failed"
                      ? "warning"
                      : "default"
                }
                sx={{ mt: 1 }}
              />
            )}
            {doc.tags && doc.tags.length > 0 && (
              <Stack
                direction="row"
                useFlexGap
                spacing={0.5}
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                {doc.tags.map((t) => (
                  <Chip key={t} label={t} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
            <Stack
              direction="row"
              useFlexGap
              spacing={1}
              sx={{ mt: 1.5, flexWrap: "wrap" }}
            >
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={onView}
                startIcon={<Eye size={14} />}
              >
                View
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={onDownload}
                startIcon={<Download size={14} />}
              >
                Download
              </Button>
              {onDiscuss && (
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  color="success"
                  onClick={onDiscuss}
                  startIcon={<MessageSquare size={14} />}
                >
                  Discuss with AI
                </Button>
              )}
              {onAnalyze && (
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={onAnalyze}
                  startIcon={<Activity size={14} />}
                >
                  View AI analysis
                </Button>
              )}
              {!readOnly && onDelete && (
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={onDelete}
                  startIcon={<Trash2 size={14} />}
                >
                  Delete
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
