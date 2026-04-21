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
import { ChevronDown, Download, Share2, Utensils } from "lucide-react";
import {
  useCreateDoctorMealPlanShareMutation,
  useLazyGetDoctorMealPlanPdfQuery,
} from "../../api/chatApi";
import type { MealPlanPayload } from "../../types/mealPlan";
import { downloadBlob } from "../../utils/downloadBlob";

interface MealPlanMessageProps {
  payload: MealPlanPayload;
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

export function MealPlanMessage({
  payload,
  isStreaming,
  messageId,
  doctorId,
  patientId,
  chatId,
}: MealPlanMessageProps) {
  const firstDay = payload.days[0]?.day_index ?? false;
  const [expanded, setExpanded] = useState<number | false>(firstDay);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedConfirmed, setSharedConfirmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [fetchPdf, { isFetching: pdfFetching }] = useLazyGetDoctorMealPlanPdfQuery();
  const [createShare, { isLoading: shareSubmitting }] =
    useCreateDoctorMealPlanShareMutation();

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
      downloadBlob(blob, `meal-plan-${safe}.pdf`);
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
        <DialogTitle>Share meal plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            The patient will see this meal plan in their portal under Meal plans. They can
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
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {day.label ?? `Day ${day.day_index}`}
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ px: 1.5, pt: 0.75, pb: 1.25 }}>
            {day.meals.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                No meals specified for this day.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {day.meals.map((meal, mIdx) => (
                  <Box key={mIdx}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        mb: 0.25,
                      }}
                    >
                      <Box
                        sx={(theme) => ({ color: theme.palette.secondary.main, lineHeight: 0 })}
                      >
                        <Utensils size={12} strokeWidth={2} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {meal.name}
                      </Typography>
                    </Box>

                    {meal.description ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: meal.items.length > 0 ? 0.5 : 0, lineHeight: 1.5 }}
                      >
                        {meal.description}
                      </Typography>
                    ) : null}

                    {meal.items.length > 0 ? (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                        {meal.items.map((item, iIdx) => (
                          <Chip
                            key={iIdx}
                            label={item}
                            size="small"
                            variant="outlined"
                            sx={(theme) => ({
                              fontSize: "0.7rem",
                              height: 22,
                              borderRadius: "4px",
                              borderColor: theme.palette.divider,
                              color: "text.secondary",
                            })}
                          />
                        ))}
                      </Box>
                    ) : null}

                    {mIdx < day.meals.length - 1 ? (
                      <Divider sx={{ mt: 1, mb: 0.25 }} />
                    ) : null}
                  </Box>
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

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
