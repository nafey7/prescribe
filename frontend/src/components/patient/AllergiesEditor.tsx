import { Plus, Trash2 } from "lucide-react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Allergy } from "../../types/patient";

interface Props {
  items: Allergy[];
  disabled?: boolean;
  onChange: (items: Allergy[]) => void;
}

const fieldProps = { size: "small" as const, fullWidth: true };

export default function AllergiesEditor({ items, disabled, onChange }: Props) {
  const update = (index: number, patch: Partial<Allergy>) => {
    const next = items.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  };

  return (
    <Stack spacing={1.5}>
      {items.map((a, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-end" } }}
          >
            <TextField
              label="Substance"
              value={a.substance}
              disabled={disabled}
              onChange={(e) => update(i, { substance: e.target.value })}
              {...fieldProps}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Reaction"
              value={a.reaction}
              disabled={disabled}
              onChange={(e) => update(i, { reaction: e.target.value })}
              {...fieldProps}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Documented"
              value={a.documented_date}
              disabled={disabled}
              onChange={(e) => update(i, { documented_date: e.target.value })}
              {...fieldProps}
              sx={{ width: { xs: "100%", sm: 128 } }}
            />
            <IconButton
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove allergy"
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
        onClick={() =>
          onChange([
            ...items,
            { substance: "", reaction: "", documented_date: "" },
          ])
        }
        variant="outlined"
        startIcon={<Plus size={16} />}
        sx={{ alignSelf: "flex-start", borderStyle: "dashed" }}
      >
        Add allergy
      </Button>
    </Stack>
  );
}
