import { Plus, Trash2 } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { FamilyHistoryEntry } from "../../types/patient";

interface Props {
  items: FamilyHistoryEntry[];
  disabled?: boolean;
  onChange: (items: FamilyHistoryEntry[]) => void;
}

const fieldProps = { size: "small" as const, fullWidth: true };

export default function FamilyHistoryEditor({
  items,
  disabled,
  onChange,
}: Props) {
  const update = (index: number, patch: Partial<FamilyHistoryEntry>) => {
    const next = items.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  };

  return (
    <Stack spacing={1.5}>
      {items.map((f, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-end" } }}
          >
            <TextField
              label="Relation"
              value={f.relation}
              disabled={disabled}
              onChange={(e) => update(i, { relation: e.target.value })}
              {...fieldProps}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Condition / notes"
              value={f.condition}
              disabled={disabled}
              onChange={(e) => update(i, { condition: e.target.value })}
              {...fieldProps}
              sx={{ flex: 2 }}
            />
            <IconButton
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove entry"
              color="error"
              sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
            >
              <Trash2 size={18} />
            </IconButton>
          </Stack>
        </Paper>
      ))}
      <Button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...items, { relation: "", condition: "" }])}
        variant="outlined"
        startIcon={<Plus size={16} />}
        sx={{ alignSelf: "flex-start", borderStyle: "dashed" }}
      >
        Add family history
      </Button>
    </Stack>
  );
}
