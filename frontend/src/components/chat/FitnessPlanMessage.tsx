import { useCallback, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { Activity, ChevronDown, Download, Share2 } from "lucide-react";
import {
  useCreateDoctorFitnessPlanShareMutation,
  useLazyGetDoctorFitnessPlanPdfQuery,
} from "../../api/chatApi";
import type { FitnessPlanPayload, WorkoutSession } from "../../types/fitnessPlan";
import { downloadBlob } from "../../utils/downloadBlob";

interface FitnessPlanMessageProps {
  payload: FitnessPlanPayload;
  isStreaming?: boolean;
  messageId?: string;
  doctorId?: string;
  patientId?: string;
  chatId?: string;
}

function formatShareError(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { detail?: unknown } }).data;
    const d = data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => String(x)).join(", ");
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

const INTENSITY_COLORS: Record<string, "success" | "warning" | "error"> = {
  low: "success",
  moderate: "warning",
  high: "error",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength",
  flexibility: "Flexibility",
  balance: "Balance",
  rest: "Rest",
};

function SessionCard({ session }: { session: WorkoutSession }) {
  const intensityColor = INTENSITY_COLORS[session.intensity] ?? "default";
  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        p: 1.5,
        mb: 1,
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1, flexWrap: "wrap", gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
          {session.name}
        </Typography>
        <Chip
          label={SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.68rem" }}
        />
        <Chip
          label={session.intensity.charAt(0).toUpperCase() + session.intensity.slice(1)}
          size="small"
          color={intensityColor}
          variant="outlined"
          sx={{ fontSize: "0.68rem" }}
        />
        <Typography variant="caption" color="text.secondary">
          {session.duration_minutes} min
        </Typography>
      </Stack>

      {session.warmup_notes ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, fontStyle: "italic" }}>
          Warm-up: {session.warmup_notes}
        </Typography>
      ) : null}

      {session.exercises.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {session.exercises.map((ex, i) => {
            const parts: string[] = [];
            if (ex.sets != null && ex.reps) parts.push(`${ex.sets} × ${ex.reps}`);
            else if (ex.sets != null) parts.push(`${ex.sets} sets`);
            else if (ex.reps) parts.push(ex.reps);
            if (ex.duration_minutes != null) parts.push(`${ex.duration_minutes} min`);
            if (ex.rest_seconds != null) parts.push(`rest ${ex.rest_seconds}s`);

            return (
              <Box key={i}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                  <Box
                    sx={(theme) => ({
                      color: theme.palette.secondary.main,
                      lineHeight: 0,
                      mt: "3px",
                      flexShrink: 0,
                    })}
                  >
                    <Activity size={12} strokeWidth={2} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {ex.name}
                    </Typography>
                    {parts.length > 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                        {parts.join(" · ")}
                      </Typography>
                    ) : null}
                    {ex.notes ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                        {ex.notes}
                      </Typography>
                    ) : null}
                    {ex.modifications.length > 0 ? (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                        {ex.modifications.map((mod, mIdx) => (
                          <Chip
                            key={mIdx}
                            label={mod}
                            size="small"
                            variant="outlined"
                            sx={(theme) => ({
                              fontSize: "0.65rem",
                              height: 20,
                              borderRadius: "4px",
                              borderColor: theme.palette.divider,
                              color: "text.secondary",
                            })}
                          />
                        ))}
                      </Box>
                    ) : null}
                  </Box>
                </Stack>
                {i < session.exercises.length - 1 ? <Divider sx={{ mt: 0.5, mb: 0.25 }} /> : null}
              </Box>
            );
          })}
        </Box>
      ) : null}

      {session.cooldown_notes ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontStyle: "italic" }}>
          Cool-down: {session.cooldown_notes}
        </Typography>
      ) : null}
    </Box>
  );
}

export function FitnessPlanMessage({
  payload,
  isStreaming,
  messageId,
  doctorId,
  patientId,
  chatId,
}: FitnessPlanMessageProps) {
  const firstDay = payload.days[0]?.day_index ?? false;
  const [expanded, setExpanded] = useState<number | false>(firstDay);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedConfirmed, setSharedConfirmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [fetchPdf, { isFetching: pdfFetching }] = useLazyGetDoctorFitnessPlanPdfQuery();
  const [createShare, { isLoading: shareSubmitting }] =
    useCreateDoctorFitnessPlanShareMutation();

  const doctorActions =
    Boolean(doctorId) && Boolean(patientId) && Boolean(chatId) && Boolean(messageId);
  const ctxReady = doctorActions && !isStreaming;
  const canDownload = ctxReady && !pdfFetching;
  const canShare = ctxReady && !shareSubmitting;

  const handleChange =
    (dayIndex: number) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? dayIndex : false);
    };

  const handleDownloadPdf = useCallback(async () => {
    if (!doctorId || !patientId || !chatId || !messageId) return;
    setToast(null);
    try {
      const blob = await fetchPdf({
        doctorId,
        patientId,
        chatId,
        messageId,
      }).unwrap();
      const safe = messageId.replace(/[^\w.-]+/g, "_").slice(0, 120) || "plan";
      downloadBlob(blob, `fitness-plan-${safe}.pdf`);
    } catch (e) {
      setToast(formatShareError(e));
    }
  }, [doctorId, patientId, chatId, messageId, fetchPdf]);

  const onConfirmShare = useCallback(async () => {
    if (!doctorId || !patientId || !chatId || !messageId) return;
    setToast(null);
    try {
      await createShare({
        doctorId,
        patientId,
        chatId,
        messageId,
      }).unwrap();
      setSharedConfirmed(true);
      setShareDialogOpen(false);
    } catch (e) {
      setToast(formatShareError(e));
    }
  }, [doctorId, patientId, chatId, messageId, createShare]);

  const savingHint = isStreaming || !messageId;
  const disabledReasonBase = savingHint
    ? "Wait until the plan is saved…"
    : !doctorActions
      ? "Missing chat context"
      : null;

  return (
    <Box
      sx={{
        width: "100%",
        "@media (prefers-reduced-motion: reduce)": {
          "& .MuiAccordion-root, & .MuiAccordionDetails-root": {
            transition: "none !important",
          },
        },
      }}
    >
      {doctorId ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: "wrap", alignItems: "center", mb: 1.5, gap: 1 }}
        >
          <Tooltip
            title={
              disabledReasonBase ??
              (pdfFetching ? "Preparing download…" : "Download PDF")
            }
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  pdfFetching ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Download size={16} />
                  )
                }
                disabled={!canDownload}
                onClick={() => void handleDownloadPdf()}
              >
                Download PDF
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={disabledReasonBase ?? "Share via patient portal"}>
            <span>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={
                  shareSubmitting ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Share2 size={16} />
                  )
                }
                disabled={!canShare}
                onClick={() => setShareDialogOpen(true)}
              >
                Share with patient
              </Button>
            </span>
          </Tooltip>
          {sharedConfirmed ? (
            <Chip size="small" color="success" variant="outlined" label="Shared" />
          ) : null}
        </Stack>
      ) : null}

      <Dialog
        open={shareDialogOpen}
        onClose={() => !shareSubmitting && setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share fitness plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            The patient will see this fitness plan in their portal under Fitness Plans. They can
            review it anytime and download the same PDF.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShareDialogOpen(false)} disabled={shareSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => void onConfirmShare()}
            disabled={shareSubmitting}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
        {payload.goal ? (
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {payload.goal}
          </Typography>
        ) : null}
        <Chip
          label={payload.fitness_level.charAt(0).toUpperCase() + payload.fitness_level.slice(1)}
          size="small"
          variant="outlined"
          color="secondary"
          sx={{ fontSize: "0.68rem" }}
        />
      </Stack>

      {payload.summary ? (
        <Typography
          variant="body2"
          sx={{ mb: 1.5, color: "text.secondary", lineHeight: 1.6 }}
        >
          {payload.summary}
        </Typography>
      ) : null}

      {payload.days.map((day) => (
        <Accordion
          key={day.day_index}
          expanded={expanded === day.day_index}
          onChange={handleChange(day.day_index)}
          disableGutters
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "6px !important",
            mb: 0.75,
            overflow: "hidden",
            "&:before": { display: "none" },
            "&.Mui-expanded": {
              borderColor: alpha(theme.palette.secondary.main, 0.45),
            },
          })}
        >
          <AccordionSummary
            expandIcon={<ChevronDown size={15} />}
            sx={(theme) => ({
              minHeight: 38,
              px: 1.5,
              "&.Mui-expanded": {
                bgcolor: alpha(theme.palette.secondary.main, 0.07),
              },
              "& .MuiAccordionSummary-content": { my: 0.5 },
              "& .MuiAccordionSummary-expandIconWrapper": {
                color: "text.secondary",
              },
            })}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {day.label ?? `Day ${day.day_index}`}
              </Typography>
              {day.is_rest_day ? (
                <Chip label="Rest" size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
              ) : null}
            </Stack>
          </AccordionSummary>

          <AccordionDetails sx={{ px: 1.5, pt: 0.75, pb: 1.25 }}>
            {day.is_rest_day ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Rest day — no workouts scheduled.
              </Typography>
            ) : day.sessions.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                No sessions specified for this day.
              </Typography>
            ) : (
              day.sessions.map((session, sIdx) => (
                <SessionCard key={sIdx} session={session} />
              ))
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {payload.medical_notes ? (
        <Box
          sx={(theme) => ({
            mt: 1.25,
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.info.main, 0.05),
            borderLeft: `3px solid ${alpha(theme.palette.info.main, 0.4)}`,
          })}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.25 }}>
            Medical notes
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {payload.medical_notes}
          </Typography>
        </Box>
      ) : null}

      {payload.disclaimer ? (
        <Typography
          variant="caption"
          sx={(theme) => ({
            display: "block",
            mt: 1.25,
            px: 1,
            py: 0.75,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.warning.main, 0.06),
            color: "text.secondary",
            borderLeft: `3px solid ${alpha(theme.palette.warning.main, 0.45)}`,
            lineHeight: 1.55,
            fontStyle: "italic",
          })}
        >
          {payload.disclaimer}
        </Typography>
      ) : null}

      {isStreaming ? (
        <Box
          component="span"
          aria-hidden
          sx={{
            display: "inline-block",
            width: 2,
            height: "1em",
            ml: 0.25,
            verticalAlign: "text-bottom",
            bgcolor: "currentColor",
            "@keyframes chatBlinkCursor": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0 },
            },
            animation: "chatBlinkCursor 0.8s steps(1) infinite",
          }}
        />
      ) : null}
    </Box>
  );
}
