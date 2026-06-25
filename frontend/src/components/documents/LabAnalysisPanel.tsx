import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import {
  useGetLabAnalysisQuery,
  useRetryLabAnalysisMutation,
} from "../../api/documentsApi";
import { rtkErrorMessage } from "../../lib/rtkErrorMessage";
import type { LabReportAnalysis } from "../../types/document";

export function LabAnalysisResultView({ analysis }: { analysis: LabReportAnalysis }) {
  return (
    <Stack spacing={2.25}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          AI lab summary
        </Typography>
        {analysis.report_date && (
          <Typography variant="caption" color="text.secondary">
            Report date: {analysis.report_date}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          {analysis.summary}
        </Typography>
      </Box>

      {analysis.critical_count > 0 && (
        <Alert severity="error">
          The report explicitly marked {analysis.critical_count} result
          {analysis.critical_count === 1 ? "" : "s"} as critical. Review the original report promptly with a clinician.
        </Alert>
      )}

      <Box>
        <Typography variant="subtitle2">Within the report&apos;s ranges</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {analysis.normal_summary || "No results could be confidently grouped as within range."}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Abnormal or flagged findings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {analysis.abnormal_summary || "No abnormal or flagged findings could be summarized."}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Suggested next steps</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {analysis.next_steps || "Review the original report with a qualified clinician."}
        </Typography>
      </Box>

      {analysis.limitations.length > 0 && (
        <Box>
          <Typography variant="subtitle2">Analysis limitations</Typography>
          <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
            {analysis.limitations.map((limitation, index) => (
              <Typography component="li" variant="body2" color="text.secondary" key={`${limitation}-${index}`}>
                {limitation}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Divider />
      <Typography variant="caption" color="text.secondary">
        {analysis.disclaimer}
      </Typography>
    </Stack>
  );
}

interface Props {
  patientId: string;
  documentId: string;
}

export default function LabAnalysisPanel({ patientId, documentId }: Props) {
  const query = useGetLabAnalysisQuery({ patientId, documentId });
  const [retry, retryState] = useRetryLabAnalysisMutation();
  const active = query.data?.status === "queued" || query.data?.status === "processing";

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void query.refetch(), 2000);
    return () => window.clearInterval(timer);
  }, [active, query.data?.status, query.refetch]);

  if (query.isLoading && !query.data) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Loading lab analysis…</Typography>
      </Stack>
    );
  }

  if (query.isError) {
    return <Alert severity="error">{rtkErrorMessage(query.error)}</Alert>;
  }

  const data = query.data;
  if (!data) return null;

  if (active) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 2 }} aria-busy="true">
        <CircularProgress size={18} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>AI is analyzing the lab report…</Typography>
          <Typography variant="caption" color="text.secondary">
            Extracting values and checking them against ranges printed in the report.
          </Typography>
        </Box>
      </Stack>
    );
  }

  if (data.status === "disabled") {
    return <Alert severity="info">AI lab analysis is currently disabled.</Alert>;
  }

  if (data.status === "failed" || data.status === "not_requested") {
    return (
      <Alert
        severity="warning"
        action={
          <Button
            color="inherit"
            size="small"
            disabled={retryState.isLoading}
            onClick={() => void retry({ patientId, documentId })}
            startIcon={<RefreshCw size={14} />}
          >
            Retry
          </Button>
        }
      >
        {data.error || "This lab report has not been analyzed yet."}
      </Alert>
    );
  }

  if (data.status === "completed" && data.analysis) {
    return (
      <Stack spacing={2}>
        <LabAnalysisResultView analysis={data.analysis} />
        <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            disabled={retryState.isLoading}
            onClick={() => void retry({ patientId, documentId })}
            startIcon={<RefreshCw size={14} />}
          >
            Re-analyze report
          </Button>
        </Stack>
      </Stack>
    );
  }

  return <Alert severity="info">No lab analysis is available for this document.</Alert>;
}
