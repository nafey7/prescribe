import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import type { EmergencyContact } from "../../types/patient";

interface Props {
  value: EmergencyContact;
  disabled?: boolean;
  onChange: (next: EmergencyContact) => void;
}

const fieldProps = { size: "small" as const, fullWidth: true };

export default function EmergencyContactForm({
  value,
  disabled,
  onChange,
}: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
      }}
    >
      <TextField
        label="Name"
        value={value.name}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        {...fieldProps}
      />
      <TextField
        label="Relationship"
        value={value.relationship}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, relationship: e.target.value })}
        {...fieldProps}
      />
      <TextField
        label="Phone"
        value={value.phone}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
        {...fieldProps}
      />
    </Box>
  );
}
