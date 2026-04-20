import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import type { DocumentCategory } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";

const ORDER: DocumentCategory[] = [
  "lab_result",
  "imaging",
  "prescription",
  "clinical_note",
  "insurance",
  "other",
];

interface Props {
  value: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      color="success"
      size="small"
      onChange={(_, next) => {
        if (next !== null) onChange(next);
      }}
      sx={{
        flexWrap: "wrap",
        gap: 1,
        "& .MuiToggleButtonGroup-grouped": {
          borderRadius: 999,
          border: "none",
          mx: 0,
          "&:not(:first-of-type)": {
            borderRadius: 999,
            borderLeft: "none",
          },
        },
      }}
    >
      <ToggleButton value="all">All</ToggleButton>
      {ORDER.map((cat) => (
        <ToggleButton key={cat} value={cat}>
          {DOCUMENT_CATEGORY_LABELS[cat]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
