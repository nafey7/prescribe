import type { ReactNode } from "react";
import { useState } from "react";
import { Check, X, FlaskConical, Pill, AlertTriangle, HeartPulse } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Suggestion, SuggestionCategory } from "../../types/suggestion";
import ConfidenceBadge from "./ConfidenceBadge";
import DuplicateIndicator from "./DuplicateIndicator";

const CATEGORY_CONFIG: Record<
  SuggestionCategory,
  { icon: typeof FlaskConical; label: string; color: "primary" | "secondary" | "warning" | "error" | "info" }
> = {
  lab_result: { icon: FlaskConical, label: "Lab Result", color: "info" },
  medication: { icon: Pill, label: "Medication", color: "primary" },
  allergy: { icon: AlertTriangle, label: "Allergy", color: "warning" },
  condition: { icon: HeartPulse, label: "Condition", color: "error" },
};

function formatExtractedData(
  category: SuggestionCategory,
  data: Record<string, unknown>
): ReactNode {
  if (category === "condition") {
    const year = data.diagnosed_year ? ` (${data.diagnosed_year})` : "";
    const status = data.status ? ` — ${data.status}` : "";
    return (
      <Box>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
          {String(data.name || "Unknown")}
          {year}
        </Typography>
        {(Boolean(status) || (data.notes != null && String(data.notes) !== "")) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {status.trim()}
            {data.notes != null && data.notes !== ""
              ? ` ${String(data.notes)}`
              : ""}
          </Typography>
        )}
      </Box>
    );
  }

  if (category === "allergy") {
    return (
      <Box>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
          {String(data.substance || "Unknown")}
        </Typography>
        {data.reaction != null && String(data.reaction) !== "" && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Reaction: {String(data.reaction)}
          </Typography>
        )}
      </Box>
    );
  }

  if (category === "medication") {
    const parts = [data.name, data.dosage, data.frequency]
      .filter(Boolean)
      .map(String);
    return (
      <Box>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
          {parts.join(" — ")}
        </Typography>
        {data.since != null && String(data.since) !== "" && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Since: {String(data.since)}
          </Typography>
        )}
      </Box>
    );
  }

  if (category === "lab_result") {
    const results = Array.isArray(data.results) ? data.results : [];
    return (
      <Box>
        {data.date != null && String(data.date) !== "" && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
            Date: {String(data.date)}
          </Typography>
        )}
        {results.map((r: Record<string, unknown>, i: number) => (
          <Stack
            key={i}
            direction="row"
            spacing={1}
            sx={{ alignItems: "baseline", flexWrap: "wrap", typography: "body2" }}
          >
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {String(r.name || "")}:
            </Typography>
            <Typography
              component="span"
              color={
                r.status === "elevated" || r.status === "abnormal"
                  ? "error"
                  : "text.primary"
              }
              sx={{
                fontWeight:
                  r.status === "elevated" || r.status === "abnormal" ? 700 : 400,
              }}
            >
              {String(r.value || "")}
            </Typography>
            {r.reference_range != null && String(r.reference_range) !== "" && (
              <Typography component="span" color="text.disabled">
                (ref: {String(r.reference_range)})
              </Typography>
            )}
          </Stack>
        ))}
      </Box>
    );
  }

  return (
    <Typography variant="caption" color="text.secondary" component="pre" sx={{ whiteSpace: "pre-wrap", m: 0 }}>
      {JSON.stringify(data, null, 2)}
    </Typography>
  );
}

interface Props {
  suggestion: Suggestion;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export default function SuggestionCard({ suggestion, onAccept, onReject }: Props) {
  const [acting, setActing] = useState<"accept" | "reject" | null>(null);
  const [exiting, setExiting] = useState(false);

  const cfg = CATEGORY_CONFIG[suggestion.category] ?? CATEGORY_CONFIG.condition;
  const Icon = cfg.icon;
  const isDuplicate = !!suggestion.duplicate_of;

  const handleAction = async (action: "accept" | "reject") => {
    setActing(action);
    try {
      setExiting(true);
      await new Promise((r) => setTimeout(r, 200));
      if (action === "accept") {
        await onAccept(suggestion.suggestion_id);
      } else {
        await onReject(suggestion.suggestion_id);
      }
    } catch {
      setExiting(false);
    } finally {
      setActing(null);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        transition: (t) =>
          t.transitions.create(["opacity", "transform"], { duration: 200 }),
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(0.96)" : "none",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: `${cfg.color}.main`, display: "flex" }}>
            <Icon size={18} />
          </Box>
          <Typography variant="body2" color={cfg.color} sx={{ fontWeight: 700 }}>
            {cfg.label}
          </Typography>
        </Stack>
        <ConfidenceBadge level={suggestion.confidence} />
      </Stack>

      <Box sx={{ mb: 1.5 }}>
        {formatExtractedData(suggestion.category, suggestion.extracted_data)}
      </Box>

      {isDuplicate && (
        <Box sx={{ mb: 1.5 }}>
          <DuplicateIndicator description={suggestion.duplicate_of!} />
        </Box>
      )}

      {suggestion.source_text && (
        <Box component="details" sx={{ mb: 1.5 }}>
          <Box
            component="summary"
            sx={{
              typography: "body2",
              color: "text.secondary",
              cursor: "pointer",
            }}
          >
            View source text
          </Box>
          <Box
            sx={(t) => ({
              mt: 0.5,
              borderRadius: 1,
              px: 1.5,
              py: 1,
              typography: "caption",
              fontStyle: "italic",
              color: "text.secondary",
              bgcolor: t.palette.action.hover,
            })}
          >
            &ldquo;{suggestion.source_text}&rdquo;
          </Box>
        </Box>
      )}

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}
      >
        {isDuplicate ? (
          <>
            <Typography variant="caption" color="text.disabled" sx={{ mr: "auto" }}>
              Already added
            </Typography>
            <Button
              type="button"
              size="small"
              variant="outlined"
              onClick={() => void handleAction("reject")}
              disabled={acting !== null}
            >
              Dismiss
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="small"
              variant="outlined"
              startIcon={<X size={14} />}
              onClick={() => void handleAction("reject")}
              disabled={acting !== null}
            >
              Reject
            </Button>
            <Button
              type="button"
              size="small"
              variant="contained"
              color="success"
              startIcon={<Check size={14} />}
              onClick={() => void handleAction("accept")}
              disabled={acting !== null}
            >
              Accept
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
