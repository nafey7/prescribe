import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { AlertTriangle, ChevronDown, Stethoscope } from "lucide-react";
import type {
  Diagnosis,
  DifferentialDiagnosisPayload,
  DiagnosisTier,
} from "../../types/differentialDiagnosis";

interface DifferentialDiagnosisMessageProps {
  payload: DifferentialDiagnosisPayload;
  isStreaming?: boolean;
}

const TIER_COLORS: Record<DiagnosisTier, "error" | "warning" | "default"> = {
  high: "error",
  moderate: "warning",
  low: "default",
};

const TIER_LABEL: Record<DiagnosisTier, string> = {
  high: "High likelihood",
  moderate: "Moderate likelihood",
  low: "Lower likelihood",
};

function ProbabilityBar({ value, tier }: { value: number; tier: DiagnosisTier }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <Box sx={{ width: "100%" }}>
      <LinearProgress
        variant="determinate"
        value={clamped}
        color={tier === "high" ? "error" : tier === "moderate" ? "warning" : "primary"}
        sx={{ height: 8, borderRadius: 999 }}
        aria-label={`${clamped}% relative likelihood`}
      />
    </Box>
  );
}

function DiagnosisRow({
  diagnosis,
  expanded,
  onChange,
}: {
  diagnosis: Diagnosis;
  expanded: boolean;
  onChange: (next: boolean) => void;
}) {
  const color = TIER_COLORS[diagnosis.tier] ?? "default";
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => onChange(next)}
      disableGutters
      elevation={0}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: "6px !important",
        mb: 0.75,
        overflow: "hidden",
        "&:before": { display: "none" },
        "&.Mui-expanded": {
          borderColor: alpha(theme.palette.primary.main, 0.45),
        },
      })}
    >
      <AccordionSummary
        expandIcon={<ChevronDown size={15} />}
        sx={(theme) => ({
          minHeight: 38,
          px: 1.5,
          "&.Mui-expanded": {
            bgcolor: alpha(theme.palette.primary.main, 0.07),
          },
          "& .MuiAccordionSummary-content": { my: 0.75 },
          "& .MuiAccordionSummary-expandIconWrapper": { color: "text.secondary" },
        })}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5, flexWrap: "wrap", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              #{diagnosis.rank}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
              {diagnosis.condition}
            </Typography>
            <Tooltip title="Model-estimated relative likelihood, not a normalized probability.">
              <Chip
                label={`${diagnosis.probability}%`}
                size="small"
                color={color}
                variant="outlined"
                sx={{ fontSize: "0.68rem" }}
              />
            </Tooltip>
            <Chip
              label={TIER_LABEL[diagnosis.tier] ?? diagnosis.tier}
              size="small"
              color={color}
              variant={color === "default" ? "outlined" : "filled"}
              sx={{ fontSize: "0.65rem" }}
            />
          </Stack>
          <ProbabilityBar value={diagnosis.probability} tier={diagnosis.tier} />
          {diagnosis.rationale ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.75, lineHeight: 1.5 }}
            >
              {diagnosis.rationale}
            </Typography>
          ) : null}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1.5, pt: 0.5, pb: 1.25 }}>
        <Stack spacing={1.25}>
          {diagnosis.supporting_evidence.length > 0 ? (
            <Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: "text.primary", display: "block", mb: 0.25 }}
              >
                Supports this diagnosis (from chart)
              </Typography>
              <Box component="ul" sx={{ pl: 2.25, m: 0 }}>
                {diagnosis.supporting_evidence.map((item, idx) => (
                  <Typography
                    key={idx}
                    component="li"
                    variant="caption"
                    color="text.secondary"
                    sx={{ lineHeight: 1.55 }}
                  >
                    {item}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : null}

          {diagnosis.contradicting_evidence.length > 0 ? (
            <Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: "text.primary", display: "block", mb: 0.25 }}
              >
                Argues against
              </Typography>
              <Box component="ul" sx={{ pl: 2.25, m: 0 }}>
                {diagnosis.contradicting_evidence.map((item, idx) => (
                  <Typography
                    key={idx}
                    component="li"
                    variant="caption"
                    color="text.secondary"
                    sx={{ lineHeight: 1.55 }}
                  >
                    {item}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : null}

          {diagnosis.key_workup.length > 0 ? (
            <Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: "text.primary", display: "block", mb: 0.25 }}
              >
                Key workup
              </Typography>
              <Box component="ul" sx={{ pl: 2.25, m: 0 }}>
                {diagnosis.key_workup.map((item, idx) => (
                  <Typography
                    key={idx}
                    component="li"
                    variant="caption"
                    color="text.secondary"
                    sx={{ lineHeight: 1.55 }}
                  >
                    {item}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export function DifferentialDiagnosisMessage({
  payload,
  isStreaming,
}: DifferentialDiagnosisMessageProps) {
  const firstRank = payload.diagnoses[0]?.rank ?? false;
  const [expanded, setExpanded] = useState<number | false>(firstRank);

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1, flexWrap: "wrap", gap: 0.5 }}>
        <Box
          sx={(theme) => ({
            color: theme.palette.primary.main,
            display: "flex",
            alignItems: "center",
          })}
        >
          <Stethoscope size={16} strokeWidth={2} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
          AI differential diagnosis
        </Typography>
        <Tooltip title="Probabilities are model-estimated relative likelihoods and do not sum to 100.">
          <Chip
            label="Verify clinically"
            size="small"
            variant="outlined"
            color="warning"
            sx={{ fontSize: "0.65rem" }}
          />
        </Tooltip>
      </Stack>

      {payload.summary ? (
        <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary", lineHeight: 1.6 }}>
          {payload.summary}
        </Typography>
      ) : null}

      {payload.diagnoses.map((d) => (
        <DiagnosisRow
          key={`${d.rank}-${d.condition}`}
          diagnosis={d}
          expanded={expanded === d.rank}
          onChange={(next) => setExpanded(next ? d.rank : false)}
        />
      ))}

      {payload.red_flags.length > 0 ? (
        <Box
          sx={(theme) => ({
            mt: 1.25,
            px: 1.25,
            py: 1,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.error.main, 0.07),
            borderLeft: `3px solid ${alpha(theme.palette.error.main, 0.55)}`,
          })}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
            <Box sx={(theme) => ({ color: theme.palette.error.main, display: "flex" })}>
              <AlertTriangle size={14} strokeWidth={2} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "error.main" }}>
              Red flags — rule out regardless of probability
            </Typography>
          </Stack>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {payload.red_flags.map((flag, idx) => (
              <Chip
                key={idx}
                label={flag}
                size="small"
                color="error"
                variant="outlined"
                sx={{ fontSize: "0.68rem" }}
              />
            ))}
          </Box>
        </Box>
      ) : null}

      {payload.recommended_workup.length > 0 ? (
        <Box sx={{ mt: 1.25 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.primary", display: "block", mb: 0.5 }}
          >
            Recommended initial workup
          </Typography>
          <Box component="ul" sx={{ pl: 2.25, m: 0 }}>
            {payload.recommended_workup.map((item, idx) => (
              <Typography
                key={idx}
                component="li"
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.55 }}
              >
                {item}
              </Typography>
            ))}
          </Box>
        </Box>
      ) : null}

      {payload.reasoning_notes ? (
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: "block", mb: 0.25 }}
          >
            Reasoning
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {payload.reasoning_notes}
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
