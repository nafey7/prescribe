import { Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material";
import type { Education } from "../../../types/doctor";

type Props = {
  items: Education[];
  disabled: boolean;
  onChange: (items: Education[]) => void;
};

const fieldProps = { size: "small" as const, fullWidth: true };

export default function DoctorEducationEditor({
  items,
  disabled,
  onChange,
}: Props) {
  const patch = (index: number, field: keyof Education, value: string) => {
    const next = items.map((row, i) => {
      if (i !== index) return row;
      if (field === "year") {
        const t = value.trim();
        return {
          ...row,
          year: t === "" ? null : Number(t),
        };
      }
      return { ...row, [field]: value };
    });
    onChange(next);
  };

  const add = () => {
    onChange([
      ...items,
      { degree: "", institution: "", year: null },
    ]);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={1.5}>
      {items.map((row, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={(t) => ({
            p: 1.5,
            bgcolor: alpha(t.palette.grey[100], 0.65),
          })}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-end" } }}
          >
            <TextField
              label="Degree"
              value={row.degree}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch(index, "degree", e.target.value)
              }
              disabled={disabled}
              {...fieldProps}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <TextField
              label="Institution"
              value={row.institution}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch(index, "institution", e.target.value)
              }
              disabled={disabled}
              {...fieldProps}
              sx={{ flex: 2, minWidth: 0 }}
            />
            <TextField
              label="Year"
              value={row.year ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch(index, "year", e.target.value)
              }
              disabled={disabled}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              {...fieldProps}
              sx={{ width: { xs: "100%", sm: 96 }, flexShrink: 0 }}
            />
            <IconButton
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label="Remove education row"
              sx={{ border: 1, borderColor: "divider" }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Stack>
        </Paper>
      ))}
      <Button
        type="button"
        onClick={add}
        disabled={disabled}
        variant="outlined"
        startIcon={<Plus size={16} />}
        sx={{ alignSelf: "flex-start" }}
      >
        Add education
      </Button>
    </Stack>
  );
}
