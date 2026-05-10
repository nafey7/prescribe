import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChevronDown } from "lucide-react";
import type { DrugInteraction, InteractionSeverity } from "../types/doctor";

const SEVERITY_COLOR: Record<
  InteractionSeverity,
  "error" | "warning" | "default"
> = {
  critical: "error",
  moderate: "warning",
  minor: "default",
};

export default function DrugInteractionWarnings({
  interactions,
  checked = false,
}: {
  interactions: DrugInteraction[];
  checked?: boolean;
}) {
  if (interactions.length === 0) {
    if (!checked) return null;
    return (
      <Alert severity="success" sx={{ py: 0.5 }}>
        No interactions detected — AI-generated, verify clinically.
      </Alert>
    );
  }

  return (
    <Stack spacing={1}>
      <Alert severity="warning" sx={{ py: 0.5 }}>
        Interaction screening results — AI-generated, verify clinically.
      </Alert>
      {interactions.map((interaction, i) => (
        <Accordion key={i} disableGutters>
          <AccordionSummary expandIcon={<ChevronDown size={16} />}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip
                label={interaction.severity}
                color={SEVERITY_COLOR[interaction.severity]}
                sx={{ fontWeight: 600, fontSize: "0.7rem" }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {interaction.title}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0.5 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {interaction.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Implicated: {interaction.implicated_drugs.join(", ")}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
