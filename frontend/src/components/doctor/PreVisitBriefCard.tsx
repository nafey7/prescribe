import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  CircleAlert,
  FileText,
  FlaskConical,
  Pill,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { PreVisitBrief } from "../../types/doctor";

type SectionProps = {
  title: string;
  emptyText: string;
  items: string[];
  icon: LucideIcon;
};

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function BriefSection({ title, emptyText, items, icon: Icon }: SectionProps) {
  return (
    <Box component="section" aria-label={title}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Box sx={{ color: "secondary.main", display: "flex" }}>
          <Icon size={17} aria-hidden />
        </Box>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Stack>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <Stack component="ul" spacing={0.75} sx={{ my: 0, pl: 2.5 }}>
          {items.map((item, index) => (
            <Typography component="li" variant="body2" key={`${title}-${index}`}>
              {item}
            </Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function PreVisitBriefCard({ brief }: { brief: PreVisitBrief }) {
  const generated = new Date(brief.generated_at);
  const generatedLabel = Number.isNaN(generated.getTime())
    ? brief.generated_at
    : generated.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return (
    <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 3 }} aria-label="Pre-visit AI brief">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ color: "secondary.main", display: "flex" }}>
              <Sparkles size={19} aria-hidden />
            </Box>
            <Typography variant="h6" component="h2">
              Pre-visit AI brief
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Generated {generatedLabel} · Last {brief.lookback_days} days
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
          <Chip label={countLabel(brief.evidence.document_count, "document")} />
          <Chip
            label={countLabel(brief.evidence.prescription_count, "prescription")}
          />
          <Chip
            label={countLabel(
              brief.evidence.pending_finding_count,
              "pending finding"
            )}
          />
        </Stack>
      </Stack>

      <Typography variant="body1" sx={{ mt: 2, fontWeight: 600 }}>
        {brief.summary}
      </Typography>
      <Divider sx={{ my: 2 }} />

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
        }}
      >
        <BriefSection
          title="Recent documents"
          emptyText="No clinically relevant recent document changes identified."
          items={brief.recent_documents}
          icon={FileText}
        />
        <BriefSection
          title="Medication changes"
          emptyText="No recent medication order changes identified."
          items={brief.medication_changes}
          icon={Pill}
        />
        <BriefSection
          title="Abnormal labs"
          emptyText="No explicitly abnormal recent lab results identified."
          items={brief.abnormal_labs}
          icon={FlaskConical}
        />
        <BriefSection
          title="Unresolved concerns"
          emptyText="No explicit unresolved concerns identified."
          items={brief.unresolved_concerns}
          icon={CircleAlert}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5 }}>
        AI-generated from available records. Verify important details in the source documents before clinical use.
      </Typography>
    </Paper>
  );
}
