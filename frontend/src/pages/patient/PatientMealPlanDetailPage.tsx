import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Download } from "lucide-react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  useGetPatientMealPlanShareQuery,
  useLazyGetPatientMealPlanSharePdfQuery,
} from "../../api/patientsApi";
import { MealPlanMessage } from "../../components/chat/MealPlanMessage";
import { usePatientContext } from "../../contexts/PatientContext";
import { paths } from "../../router/paths";
import { downloadBlob } from "../../utils/downloadBlob";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function PatientMealPlanDetailPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const { currentPatientId } = usePatientContext();
  const { data, isLoading, error } = useGetPatientMealPlanShareQuery(
    { patientId: currentPatientId!, shareId: shareId! },
    { skip: !currentPatientId || !shareId }
  );
  const [fetchPdf, { isFetching: pdfFetching }] = useLazyGetPatientMealPlanSharePdfQuery();
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  const onDownload = async () => {
    if (!currentPatientId || !shareId) return;
    setPdfToast(null);
    try {
      const blob = await fetchPdf({ patientId: currentPatientId, shareId }).unwrap();
      const safe = shareId.replace(/[^\w.-]+/g, "_").slice(0, 120) || "plan";
      downloadBlob(blob, `meal-plan-${safe}.pdf`);
    } catch {
      setPdfToast("Could not download PDF. Please try again.");
    }
  };

  if (!currentPatientId) {
    return (
      <Alert severity="info" role="status">
        Select a patient profile to view this meal plan.
      </Alert>
    );
  }

  if (!shareId) {
    return <Alert severity="warning">Missing plan id.</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Stack spacing={2}>
        <Alert severity="error" role="alert">
          This meal plan could not be loaded. It may have been removed, or you may not have access.
        </Alert>
        <Button component={RouterLink} to={paths.patient.mealPlans} variant="outlined" size="small">
          Back to meal plans
        </Button>
      </Stack>
    );
  }

  const title =
    data.chat_title?.trim() || data.meal_plan.summary?.trim() || "Meal plan";
  const who = data.doctor_display_name?.trim() || data.doctor_id;

  return (
    <Stack spacing={3}>
      <div>
        <Link
          component={RouterLink}
          to={paths.patient.mealPlans}
          variant="body2"
          underline="hover"
          sx={{ mb: 1, display: "inline-block" }}
        >
          ← Meal plans
        </Link>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Shared by {who} · {formatWhen(data.created_at)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={
              pdfFetching ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Download size={18} />
              )
            }
            disabled={pdfFetching}
            onClick={() => void onDownload()}
            sx={{ flexShrink: 0 }}
          >
            Download PDF
          </Button>
        </Stack>
      </div>

      <Box
        sx={(theme) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 2,
          bgcolor: "background.paper",
        })}
      >
        <MealPlanMessage payload={data.meal_plan} />
      </Box>

      <Snackbar
        open={Boolean(pdfToast)}
        autoHideDuration={6000}
        onClose={() => setPdfToast(null)}
        message={pdfToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Stack>
  );
}
