import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

type Props = {
  institution: string;
  department: string;
  years_of_experience: string;
  accepting_new_patients: boolean;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

const fieldProps = { size: "small" as const, fullWidth: true };

export default function DoctorInstitutionForm({
  institution,
  department,
  years_of_experience,
  accepting_new_patients,
  disabled,
  onChange,
}: Props) {
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
        }}
      >
        <TextField
          label="Institution"
          value={institution}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ institution: e.target.value })
          }
          disabled={disabled}
          {...fieldProps}
        />
        <TextField
          label="Department"
          value={department}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ department: e.target.value })
          }
          disabled={disabled}
          {...fieldProps}
        />
      </Box>
      <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="Years of experience"
          value={years_of_experience}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ years_of_experience: e.target.value })
          }
          disabled={disabled}
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
          {...fieldProps}
          sx={{ width: { xs: "100%", sm: 160 } }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={accepting_new_patients}
              onChange={(e) =>
                onChange({ accepting_new_patients: e.target.checked })
              }
              disabled={disabled}
            />
          }
          label="Accepting new patients"
        />
      </Stack>
    </Stack>
  );
}
