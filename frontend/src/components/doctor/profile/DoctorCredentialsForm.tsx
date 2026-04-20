import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

type Props = {
  license_number: string;
  license_state: string;
  npi_number: string;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

const fieldProps = { size: "small" as const, fullWidth: true };

export default function DoctorCredentialsForm({
  license_number,
  license_state,
  npi_number,
  disabled,
  onChange,
}: Props) {
  const handle =
    (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value });
    };

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
      }}
    >
      <TextField
        label="License number"
        value={license_number}
        onChange={handle("license_number")}
        disabled={disabled}
        {...fieldProps}
      />
      <TextField
        label="License state"
        value={license_state}
        onChange={handle("license_state")}
        disabled={disabled}
        placeholder="e.g. CA"
        {...fieldProps}
      />
      <TextField
        label="NPI number"
        value={npi_number}
        onChange={handle("npi_number")}
        disabled={disabled}
        {...fieldProps}
      />
    </Box>
  );
}
