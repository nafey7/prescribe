import { alpha } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChevronRight, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { useListPatientMealPlanSharesQuery } from "../../api/patientsApi";
import { usePatientContext } from "../../contexts/PatientContext";
import { paths } from "../../router/paths";

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

export default function PatientMealPlansPage() {
  const { currentPatientId } = usePatientContext();
  const { data, isLoading, error } = useListPatientMealPlanSharesQuery(
    { patientId: currentPatientId, skip: 0, limit: 100 },
    { skip: !currentPatientId }
  );

  if (!currentPatientId) {
    return (
      <Alert severity="info" role="status">
        Select a patient profile to view shared meal plans.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" role="alert">
        Could not load meal plans. Please try again.
      </Alert>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <Stack
        spacing={2}
        sx={{
          alignItems: "center",
          textAlign: "center",
          py: 6,
          px: 2,
        }}
      >
        <Box
          sx={(theme) => ({
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.secondary.main, 0.1),
            color: "secondary.main",
          })}
        >
          <Utensils size={32} strokeWidth={1.5} aria-hidden />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          No meal plans yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.6 }}>
          When your doctor shares a meal plan from chat, it will appear here. You can open it anytime
          and download a PDF.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Meal plans
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Plans your doctor has shared with you. Open one to view details and download a PDF.
      </Typography>

      <Stack spacing={1.5}>
        {items.map((row) => {
          const title =
            row.chat_title?.trim() ||
            row.summary_line?.trim() ||
            "Meal plan";
          const who = row.doctor_display_name?.trim() || row.doctor_id;
          return (
            <Card key={row.share_id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea
                component={Link}
                to={paths.patient.mealPlanDetail(row.share_id)}
                sx={{ alignItems: "stretch" }}
              >
                <CardContent sx={{ py: 2, px: 2.5, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Stack spacing={0.5} sx={{ minWidth: 0, textAlign: "left" }}>
                      <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                        {title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {who} · {formatWhen(row.created_at)}
                      </Typography>
                    </Stack>
                    <ChevronRight size={20} color="var(--mui-palette-text-secondary)" aria-hidden />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
