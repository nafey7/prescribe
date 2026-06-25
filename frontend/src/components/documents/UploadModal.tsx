import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material";
import {
  Check,
  CheckCircle2,
  FileText,
  PackageOpen,
  Sparkles,
  X,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadDocument } from "../../api/documents";
import {
  useAcceptAllSuggestionsMutation,
  useAcceptSuggestionMutation,
  useLazyListSuggestionsQuery,
  useRejectAllSuggestionsMutation,
  useRejectSuggestionMutation,
} from "../../api/suggestionsApi";
import { baseApi } from "../../api/baseApi";
import { useLazyGetDocumentMetadataQuery } from "../../api/documentsApi";
import { useFeatureFlags } from "../../contexts/FeatureFlagContext";
import { rtkErrorMessage } from "../../lib/rtkErrorMessage";
import { useAppDispatch } from "../../store/hooks";
import type { DocumentCategory } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";
import type { Suggestion } from "../../types/suggestion";
import SuggestionCard from "../suggestions/SuggestionCard";
import UploadDropzone from "./UploadDropzone";
import LabAnalysisPanel from "./LabAnalysisPanel";

const CATEGORIES: DocumentCategory[] = [
  "lab_result",
  "imaging",
  "prescription",
  "clinical_note",
  "insurance",
  "other",
];

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

type Step = 1 | 2;

interface Props {
  patientId: string;
  open: boolean;
  onClose: () => void;
  /** Optional; document list usually refreshes via RTK tag invalidation after upload. */
  onUploaded?: () => void;
}

export default function UploadModal({
  patientId,
  open,
  onClose,
  onUploaded,
}: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [allResolved, setAllResolved] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [awaitingPdfAnalysis, setAwaitingPdfAnalysis] = useState(false);

  const { aiSuggestionsEnabled } = useFeatureFlags();
  const dispatch = useAppDispatch();
  const [triggerListSuggestions] = useLazyListSuggestionsQuery();
  const [triggerDocumentMetadata] = useLazyGetDocumentMetadataQuery();
  const [acceptSuggestionMut] = useAcceptSuggestionMutation();
  const [rejectSuggestionMut] = useRejectSuggestionMutation();
  const [acceptAllMut] = useAcceptAllSuggestionsMutation();
  const [rejectAllMut] = useRejectAllSuggestionsMutation();
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const cancelledRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    cancelledRef.current = true;
  }, []);

  useEffect(() => {
    if (!open) {
      clearPolling();
      setStep(1);
      setFile(null);
      setError(null);
      setUploadDone(false);
      setDocumentId(null);
      setProgress(0);
      setCategory("other");
      setDescription("");
      setAnalyzing(false);
      setSuggestions([]);
      setSuggestionsLoaded(false);
      setAllResolved(false);
      setSuggestionError(null);
      setAwaitingPdfAnalysis(false);
      pollCountRef.current = 0;
    }
  }, [open, clearPolling]);

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

  const pollForSuggestions = useCallback(
    (docId: string) => {
      cancelledRef.current = false;
      pollCountRef.current = 0;
      setAnalyzing(true);

      const tick = async () => {
        if (cancelledRef.current) return;
        pollCountRef.current += 1;

        try {
          const data = await triggerListSuggestions({
            patientId,
            documentId: docId,
          }).unwrap();
          if (cancelledRef.current) return;

          if (data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setSuggestionsLoaded(true);
            setAnalyzing(false);
            return;
          }
        } catch {
          // keep polling on transient errors
        }

        if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
          if (!cancelledRef.current) {
            setSuggestionsLoaded(true);
            setAnalyzing(false);
          }
          return;
        }

        pollRef.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      };

      pollRef.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    },
    [patientId, triggerListSuggestions]
  );

  const pollForPdfAnalysis = useCallback(
    (docId: string) => {
      cancelledRef.current = false;
      pollCountRef.current = 0;
      setAwaitingPdfAnalysis(true);
      setAnalyzing(true);

      const tick = async () => {
        if (cancelledRef.current) return;
        pollCountRef.current += 1;

        try {
          const metadata = await triggerDocumentMetadata({
            patientId,
            documentId: docId,
          }).unwrap();
          if (cancelledRef.current) return;

          if (
            metadata.analysis_status === "completed" ||
            metadata.analysis_status === "failed" ||
            metadata.analysis_status === "disabled"
          ) {
            const resolvedCategory = CATEGORIES.includes(
              metadata.category as DocumentCategory
            )
              ? (metadata.category as DocumentCategory)
              : "other";
            setCategory(resolvedCategory);
            setAwaitingPdfAnalysis(false);
            setAnalyzing(false);
            dispatch(
              baseApi.util.invalidateTags([{ type: "Documents", id: patientId }])
            );

            if (metadata.analysis_status === "failed") {
              setSuggestionError("AI could not analyze this PDF. You can retry from the document card.");
              setSuggestionsLoaded(true);
              return;
            }

            if (resolvedCategory !== "lab_result") {
              const data = await triggerListSuggestions({
                patientId,
                documentId: docId,
              }).unwrap();
              if (cancelledRef.current) return;
              setSuggestions(data.suggestions);
              setSuggestionsLoaded(true);
            }
            return;
          }
        } catch {
          // Keep polling on transient request failures.
        }

        if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
          if (!cancelledRef.current) {
            setAwaitingPdfAnalysis(false);
            setAnalyzing(false);
            setSuggestionsLoaded(true);
            setSuggestionError("AI analysis is taking longer than expected. The document will continue processing in the background.");
          }
          return;
        }

        pollRef.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      };

      pollRef.current = setTimeout(() => void tick(), 500);
    },
    [dispatch, patientId, triggerDocumentMetadata, triggerListSuggestions]
  );

  const handleContinue = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setStep(2);
    setSubmitting(true);
    setProgress(0);

    try {
      const result = await uploadDocument(
        patientId,
        file,
        category,
        description,
        (loaded, total) => {
          if (total > 0) setProgress(Math.round((loaded / total) * 100));
        }
      );
      setUploadDone(true);
      setDocumentId(result.document_id);
      const detectedCategory = CATEGORIES.includes(
        result.category as DocumentCategory
      )
        ? (result.category as DocumentCategory)
        : category;
      setCategory(detectedCategory);
      dispatch(
        baseApi.util.invalidateTags([{ type: "Documents", id: patientId }])
      );
      onUploaded?.();

      if (aiSuggestionsEnabled && result.content_type.includes("pdf")) {
        pollForPdfAnalysis(result.document_id);
      } else if (aiSuggestionsEnabled && detectedCategory !== "lab_result") {
        pollForSuggestions(result.document_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    clearPolling();
    onClose();
  };

  const handleBack = () => {
    clearPolling();
    setStep(1);
    setError(null);
    setSuggestionError(null);
    setAwaitingPdfAnalysis(false);
    setUploadDone(false);
    setDocumentId(null);
    setAnalyzing(false);
    setSuggestions([]);
    setSuggestionsLoaded(false);
    setAllResolved(false);
    setProgress(0);
    pollCountRef.current = 0;
  };

  const handleAccept = async (suggestionId: string) => {
    setSuggestionError(null);
    try {
      await acceptSuggestionMut({ patientId, suggestionId }).unwrap();
    } catch (e) {
      setSuggestionError(rtkErrorMessage(e));
      return;
    }
    setSuggestions((prev) => {
      const next = prev.filter((s) => s.suggestion_id !== suggestionId);
      if (next.length === 0) setAllResolved(true);
      return next;
    });
  };

  const handleReject = async (suggestionId: string) => {
    setSuggestionError(null);
    try {
      await rejectSuggestionMut({ patientId, suggestionId }).unwrap();
    } catch (e) {
      setSuggestionError(rtkErrorMessage(e));
      return;
    }
    setSuggestions((prev) => {
      const next = prev.filter((s) => s.suggestion_id !== suggestionId);
      if (next.length === 0) setAllResolved(true);
      return next;
    });
  };

  const handleAcceptAll = async () => {
    if (!documentId) return;
    setSuggestionError(null);
    try {
      await acceptAllMut({ patientId, documentId }).unwrap();
    } catch (e) {
      setSuggestionError(rtkErrorMessage(e));
      return;
    }
    setSuggestions([]);
    setAllResolved(true);
  };

  const handleRejectAll = async () => {
    if (!documentId) return;
    setSuggestionError(null);
    try {
      await rejectAllMut({ patientId, documentId }).unwrap();
    } catch (e) {
      setSuggestionError(rtkErrorMessage(e));
      return;
    }
    setSuggestions([]);
    setAllResolved(true);
  };

  const handleSkipSuggestions = () => {
    clearPolling();
    setAnalyzing(false);
    setSuggestionsLoaded(true);
    setSuggestions([]);
  };

  const isPdf =
    file?.type.includes("pdf") || file?.name.toLowerCase().endsWith(".pdf");

  const isLabReport = category === "lab_result" && !awaitingPdfAnalysis;
  const step2Label = aiSuggestionsEnabled
    ? isLabReport
      ? "Analyze"
      : "Review"
    : "Upload";
  const stepDone = (n: number) => step > n || (n === 2 && uploadDone);

  const handleDialogClose: NonNullable<
    ComponentProps<typeof Dialog>["onClose"]
  > = (_event, reason) => {
    if (reason === "backdropClick") return;
    if (submitting) return;
    handleDone();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="upload-modal-title"
    >
      <DialogTitle
        id="upload-modal-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pr: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography component="span" variant="h6">
          Upload document
        </Typography>
        <IconButton
          type="button"
          onClick={() => !submitting && handleDone()}
          disabled={submitting}
          aria-label="Close"
          edge="end"
        >
          <X size={22} />
        </IconButton>
      </DialogTitle>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          px: 3,
          pt: 2,
          pb: 1,
          flexShrink: 0,
          alignItems: "center",
        }}
      >
        <StepIndicator
          num={1}
          label="Select file"
          active={step === 1}
          done={stepDone(1)}
        />
        <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
        <StepIndicator
          num={2}
          label={step2Label}
          active={step === 2}
          done={stepDone(2)}
        />
      </Stack>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          pt: 1,
          overflow: "auto",
        }}
      >
        {step === 1 && (
          <Stack spacing={2}>
            <UploadDropzone
              file={file}
              onFile={setFile}
              error={null}
              disabled={false}
            />

            {previewUrl && (
              <Box
                sx={{
                  overflow: "hidden",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "action.hover",
                }}
              >
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Selected file preview"
                  sx={{
                    display: "block",
                    mx: "auto",
                    maxHeight: 192,
                    width: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
            {file && !previewUrl && isPdf && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "action.hover",
                  px: 1.5,
                  py: 1,
                }}
              >
                <FileText size={18} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.primary">
                  PDF ready to upload
                </Typography>
              </Stack>
            )}

            <FormControl fullWidth size="small">
              <InputLabel id="doc-category-label">Category</InputLabel>
              <Select<DocumentCategory>
                labelId="doc-category-label"
                id="doc-category"
                label="Category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as DocumentCategory)
                }
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {DOCUMENT_CATEGORY_LABELS[c]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              id="doc-desc"
              label="Notes (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
              size="small"
              placeholder="e.g. Lab panel from January visit"
            />

            {error && (
              <Typography variant="body2" color="error" role="alert">
                {error}
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={1}
              sx={{ pt: 1, justifyContent: "flex-end" }}
            >
              <Button type="button" onClick={onClose} color="inherit">
                Cancel
              </Button>
              <Button
                type="button"
                variant="contained"
                color="success"
                onClick={() => void handleContinue()}
                disabled={!file}
              >
                Continue
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2} sx={{ py: 1 }}>
            {submitting && (
              <Stack sx={{ alignItems: "center", py: 3 }}>
                <CircularProgress color="success" size={36} />
                <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600 }}>
                  Uploading your document...
                </Typography>
                <Box sx={{ mt: 1.5, width: "100%", maxWidth: 280 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress || 8}
                    color="success"
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block", textAlign: "center" }}
                  >
                    {progress}%
                  </Typography>
                </Box>
              </Stack>
            )}

            {!submitting && error && (
              <Stack sx={{ alignItems: "center", py: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.error.main, 0.12),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={24} color={theme.palette.error.main} />
                </Box>
                <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 600 }}>
                  Upload failed
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                  {error}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button type="button" variant="outlined" onClick={handleBack}>
                    Go back
                  </Button>
                  <Button
                    type="button"
                    variant="contained"
                    color="success"
                    onClick={() => void handleContinue()}
                  >
                    Retry
                  </Button>
                </Stack>
              </Stack>
            )}

            {!submitting && uploadDone && (
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <CheckCircle2
                    size={20}
                    color={theme.palette.success.main}
                    style={{ flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "success.dark" }}>
                      Document uploaded successfully
                    </Typography>
                    {file && (
                      <Typography variant="caption" color="success.main">
                        {file.name}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                {aiSuggestionsEnabled && !isLabReport && analyzing && (
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{
                        alignItems: "center",
                        borderRadius: 2,
                        border: 1,
                        borderColor: alpha(theme.palette.info.main, 0.35),
                        bgcolor: alpha(theme.palette.info.main, 0.08),
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <Sparkles
                        size={20}
                        color={theme.palette.info.main}
                        style={{ flexShrink: 0 }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "info.main" }}>
                          AI is analyzing your document...
                        </Typography>
                        <Typography variant="caption" color="info.main">
                          Looking for conditions, medications, allergies, and lab results
                        </Typography>
                      </Box>
                      <CircularProgress size={16} sx={{ color: "info.main", flexShrink: 0 }} />
                    </Stack>
                    <Stack direction="row" sx={{ pt: 0.5, justifyContent: "flex-end" }}>
                      <Button type="button" color="inherit" onClick={handleSkipSuggestions}>
                        Skip — I&apos;ll review later
                      </Button>
                    </Stack>
                  </Stack>
                )}

                {aiSuggestionsEnabled &&
                  !isLabReport &&
                  suggestionsLoaded &&
                  !allResolved &&
                  suggestions.length > 0 && (
                    <Stack spacing={1.5}>
                      {suggestionError && (
                        <Alert severity="error">{suggestionError}</Alert>
                      )}
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 700 }}>
                          <Sparkles
                            size={14}
                            style={{
                              display: "inline",
                              verticalAlign: "middle",
                              marginRight: 6,
                              color: theme.palette.success.main,
                            }}
                          />
                          {suggestions.length} suggestion
                          {suggestions.length !== 1 ? "s" : ""} found
                        </Typography>
                        {suggestions.length > 1 && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              type="button"
                              size="small"
                              color="inherit"
                              onClick={() => void handleRejectAll()}
                            >
                              Dismiss all
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              color="success"
                              onClick={() => void handleAcceptAll()}
                            >
                              Accept all
                            </Button>
                          </Stack>
                        )}
                      </Stack>

                      <Stack spacing={1.5}>
                        {suggestions.map((s) => (
                          <SuggestionCard
                            key={s.suggestion_id}
                            suggestion={s}
                            onAccept={handleAccept}
                            onReject={handleReject}
                          />
                        ))}
                      </Stack>

                      <Stack direction="row" sx={{ pt: 1, justifyContent: "flex-end" }}>
                        <Button
                          type="button"
                          variant="contained"
                          color="success"
                          onClick={handleDone}
                        >
                          Done
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                {aiSuggestionsEnabled && !isLabReport && suggestionsLoaded && allResolved && (
                  <Stack sx={{ alignItems: "center", py: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        bgcolor: alpha(theme.palette.success.main, 0.15),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={24} color={theme.palette.success.main} />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600 }}>
                      All suggestions reviewed
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Your profile has been updated
                    </Typography>
                    <Button
                      type="button"
                      variant="contained"
                      color="success"
                      onClick={handleDone}
                      sx={{ mt: 2 }}
                    >
                      Done
                    </Button>
                  </Stack>
                )}

                {aiSuggestionsEnabled && isLabReport && documentId && (
                  <Stack spacing={2}>
                    <LabAnalysisPanel
                      patientId={patientId}
                      documentId={documentId}
                    />
                    <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                      <Button
                        type="button"
                        variant="contained"
                        color="success"
                        onClick={handleDone}
                      >
                        Done
                      </Button>
                    </Stack>
                  </Stack>
                )}

                {((!aiSuggestionsEnabled && uploadDone) ||
                  (aiSuggestionsEnabled &&
                    !isLabReport &&
                    suggestionsLoaded &&
                    !allResolved &&
                    suggestions.length === 0)) && (
                  <Stack sx={{ alignItems: "center", py: 2 }}>
                    <PackageOpen size={32} color={theme.palette.action.disabled} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {aiSuggestionsEnabled
                        ? "No suggestions were found in this document"
                        : "Upload complete"}
                    </Typography>
                    <Button
                      type="button"
                      variant="contained"
                      color="success"
                      onClick={handleDone}
                      sx={{ mt: 2 }}
                    >
                      Done
                    </Button>
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          bgcolor: done || active ? "success.main" : "action.hover",
          color: done || active ? "success.contrastText" : "text.secondary",
        }}
      >
        {done ? <Check size={14} /> : num}
      </Box>
      <Typography
        variant="body2"
        color={active || done ? "text.primary" : "text.secondary"}
        sx={{ fontWeight: active || done ? 600 : 400 }}
      >
        {label}
      </Typography>
    </Stack>
  );
}
