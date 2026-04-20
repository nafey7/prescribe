import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Lifestyle } from "../../types/patient";

interface Props {
  value: Lifestyle;
  disabled?: boolean;
  onChange: (next: Lifestyle) => void;
}

const fieldProps = { size: "small" as const, fullWidth: true };

export default function LifestyleEditor({ value, disabled, onChange }: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
      }}
    >
      <TextField
        label="Smoking status"
        select
        value={value.smoking_status}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, smoking_status: e.target.value })}
        {...fieldProps}
      >
        <MenuItem value="unknown">Unknown</MenuItem>
        <MenuItem value="never">Never</MenuItem>
        <MenuItem value="former">Former</MenuItem>
        <MenuItem value="current">Current</MenuItem>
      </TextField>
      <TextField
        label="Smoking notes"
        value={value.smoking_notes}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, smoking_notes: e.target.value })}
        multiline
        minRows={3}
        {...fieldProps}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
      <TextField
        label="Alcohol"
        value={value.alcohol}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, alcohol: e.target.value })}
        {...fieldProps}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
      <TextField
        label="Exercise"
        value={value.exercise}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, exercise: e.target.value })}
        {...fieldProps}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
      <TextField
        label="Diet notes"
        value={value.diet_notes}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, diet_notes: e.target.value })}
        multiline
        minRows={3}
        {...fieldProps}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
    </Box>
  );
}
