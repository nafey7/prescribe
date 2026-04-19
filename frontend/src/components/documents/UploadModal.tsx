import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  PackageOpen,
  Sparkles,
  X,
} from "lucide-react";
import { uploadDocument } from "../../api/documents";
import {
  useAcceptAllSuggestionsMutation,
  useAcceptSuggestionMutation,
  useLazyListSuggestionsQuery,
  useRejectAllSuggestionsMutation,
  useRejectSuggestionMutation,
} from "../../api/suggestionsApi";
import { baseApi } from "../../api/baseApi";
import { useFeatureFlags } from "../../contexts/FeatureFlagContext";
import { rtkErrorMessage } from "../../lib/rtkErrorMessage";
import { useAppDispatch } from "../../store/hooks";
import type { DocumentCategory } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";
import type { Suggestion } from "../../types/suggestion";
import SuggestionCard from "../suggestions/SuggestionCard";
import UploadDropzone from "./UploadDropzone";

const CATEGORIES: DocumentCategory[] = [
  "lab_result",
  "imaging",
  "prescription",
  "clinical_note",
  "insurance",
  "other",
];

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

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

  const { aiSuggestionsEnabled } = useFeatureFlags();
  const dispatch = useAppDispatch();
  const [triggerListSuggestions] = useLazyListSuggestionsQuery();
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

  if (!open) return null;

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
      dispatch(
        baseApi.util.invalidateTags([{ type: "Documents", id: patientId }])
      );
      onUploaded?.();

      if (aiSuggestionsEnabled) {
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

  const step2Label = aiSuggestionsEnabled ? "Review" : "Upload";
  const stepDone = (n: number) => step > n || (n === 2 && uploadDone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2
            id="upload-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Upload document
          </h2>
          <button
            type="button"
            onClick={() => !submitting && handleDone()}
            disabled={submitting}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="flex shrink-0 items-center gap-3 px-6 pt-4 pb-2">
          <StepIndicator
            num={1}
            label="Select file"
            active={step === 1}
            done={stepDone(1)}
          />
          <div className="h-px flex-1 bg-gray-200" />
          <StepIndicator
            num={2}
            label={step2Label}
            active={step === 2}
            done={stepDone(2)}
          />
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2">
          {/* ─── Step 1: File selection ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <UploadDropzone
                file={file}
                onFile={setFile}
                error={null}
                disabled={false}
              />

              {previewUrl && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <img
                    src={previewUrl}
                    alt="Selected file preview"
                    className="mx-auto max-h-48 w-full object-contain"
                  />
                </div>
              )}
              {file && !previewUrl && isPdf && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <FileText className="text-gray-500" size={18} />
                  PDF ready to upload
                </div>
              )}

              <div>
                <label
                  htmlFor="doc-category"
                  className="block text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <select
                  id="doc-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as DocumentCategory)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {DOCUMENT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="doc-desc"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notes{" "}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="doc-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Lab panel from January visit"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleContinue()}
                  disabled={!file}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Upload + AI suggestions ─── */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              {/* Uploading */}
              {submitting && (
                <div className="flex flex-col items-center py-6">
                  <Loader2
                    size={36}
                    className="animate-spin text-emerald-600"
                  />
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Uploading your document...
                  </p>
                  <div className="mt-3 w-full max-w-xs">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${progress || 8}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-500">
                      {progress}%
                    </p>
                  </div>
                </div>
              )}

              {/* Upload error */}
              {!submitting && error && (
                <div className="flex flex-col items-center py-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <X size={24} className="text-red-600" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-red-700">
                    Upload failed
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{error}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Go back
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleContinue()}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Upload succeeded */}
              {!submitting && uploadDone && (
                <div className="space-y-4">
                  {/* Success header */}
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-emerald-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-800">
                        Document uploaded successfully
                      </p>
                      {file && (
                        <p className="text-xs text-emerald-600">{file.name}</p>
                      )}
                    </div>
                  </div>

                  {/* AI analyzing state */}
                  {aiSuggestionsEnabled && analyzing && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <Sparkles size={20} className="shrink-0 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-blue-800">
                            AI is analyzing your document...
                          </p>
                          <p className="text-xs text-blue-600">
                            Looking for conditions, medications, allergies, and
                            lab results
                          </p>
                        </div>
                        <Loader2
                          size={16}
                          className="shrink-0 animate-spin text-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSkipSuggestions}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
                        >
                          Skip — I'll review later
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Suggestions loaded with results */}
                  {aiSuggestionsEnabled &&
                    suggestionsLoaded &&
                    !allResolved &&
                    suggestions.length > 0 && (
                      <div className="space-y-3">
                        {suggestionError && (
                          <p
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                            role="alert"
                          >
                            {suggestionError}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            <Sparkles
                              size={14}
                              className="mr-1.5 inline text-emerald-600"
                            />
                            {suggestions.length} suggestion
                            {suggestions.length !== 1 ? "s" : ""} found
                          </p>
                          {suggestions.length > 1 && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleRejectAll()}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700"
                              >
                                Dismiss all
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleAcceptAll()}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                              >
                                Accept all
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {suggestions.map((s) => (
                            <SuggestionCard
                              key={s.suggestion_id}
                              suggestion={s}
                              onAccept={handleAccept}
                              onReject={handleReject}
                            />
                          ))}
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleDone}
                            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}

                  {/* All suggestions resolved */}
                  {aiSuggestionsEnabled &&
                    suggestionsLoaded &&
                    allResolved && (
                      <div className="flex flex-col items-center py-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                          <Check size={24} className="text-emerald-600" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-900">
                          All suggestions reviewed
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Your profile has been updated
                        </p>
                        <button
                          type="button"
                          onClick={handleDone}
                          className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Done
                        </button>
                      </div>
                    )}

                  {/* No suggestions found (or feature off, or skipped) */}
                  {((!aiSuggestionsEnabled && uploadDone) ||
                    (aiSuggestionsEnabled &&
                      suggestionsLoaded &&
                      !allResolved &&
                      suggestions.length === 0)) && (
                    <div className="flex flex-col items-center py-4">
                      <PackageOpen size={32} className="text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">
                        {aiSuggestionsEnabled
                          ? "No suggestions were found in this document"
                          : "Upload complete"}
                      </p>
                      <button
                        type="button"
                        onClick={handleDone}
                        className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
          done
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 text-gray-500"
        }`}
      >
        {done ? <Check size={14} /> : num}
      </div>
      <span
        className={`text-sm ${
          active || done ? "font-medium text-gray-900" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
