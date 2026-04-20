import { Plus, Trash2 } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Condition } from "../../types/patient";

interface Props {
  items: Condition[];
  disabled?: boolean;
  onChange: (items: Condition[]) => void;
}

const fieldProps = { size: "small" as const, fullWidth: true };

export default function ConditionsEditor({ items, disabled, onChange }: Props) {
  const update = (index: number, patch: Partial<Condition>) => {
    const next = items.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  };

  return (
    <Stack spacing={1.5}>
      {items.map((c, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(12, 1fr)" },
              alignItems: "end",
            }}
          >
            <TextField
              label="Name"
              value={c.name}
              disabled={disabled}
              onChange={(e) => update(i, { name: e.target.value })}
              {...fieldProps}
              sx={{ gridColumn: { sm: "span 4" } }}
            />
            <TextField
              label="Year"
              type="number"
              value={c.diagnosed_year ?? ""}
              disabled={disabled}
              onChange={(e) =>
                update(i, {
                  diagnosed_year:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              {...fieldProps}
              sx={{ gridColumn: { sm: "span 2" } }}
            />
            <TextField
              label="Status"
              select
              value={c.status}
              disabled={disabled}
              onChange={(e) => update(i, { status: e.target.value })}
              {...fieldProps}
              sx={{ gridColumn: { sm: "span 2" } }}
            >
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="resolved">resolved</MenuItem>
              <MenuItem value="managed">managed</MenuItem>
            </TextField>
            <TextField
              label="Notes"
              value={c.notes}
              disabled={disabled}
              onChange={(e) => update(i, { notes: e.target.value })}
              {...fieldProps}
              sx={{ gridColumn: { sm: "span 3" } }}
            />
            <IconButton
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove condition"
              color="error"
              sx={{ gridColumn: { sm: "span 1" }, justifySelf: "end" }}
            >
              <Trash2 size={18} />
            </IconButton>
          </Box>
        </Paper>
      ))}
      <Button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...items,
            {
              name: "",
              diagnosed_year: null,
              status: "active",
              notes: "",
            },
          ])
        }
        variant="outlined"
        startIcon={<Plus size={16} />}
        sx={{ alignSelf: "flex-start", borderStyle: "dashed" }}
      >
        Add condition
      </Button>
    </Stack>
  );
}
