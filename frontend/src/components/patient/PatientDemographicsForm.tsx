import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Address } from "../../types/patient";

interface Props {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  sex: string;
  blood_type: string;
  weight_kg: string;
  height_cm: string;
  phone: string;
  address: Address;
  disabled?: boolean;
  onChange: (patch: Record<string, unknown>) => void;
}

const fieldProps = { size: "small" as const, fullWidth: true };

export default function PatientDemographicsForm({
  first_name,
  last_name,
  email,
  date_of_birth,
  sex,
  blood_type,
  weight_kg,
  height_cm,
  phone,
  address,
  disabled,
  onChange,
}: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
      }}
    >
      <TextField
        label="First name"
        value={first_name}
        disabled={disabled}
        onChange={(e) => onChange({ first_name: e.target.value })}
        required
        {...fieldProps}
      />
      <TextField
        label="Last name"
        value={last_name}
        disabled={disabled}
        onChange={(e) => onChange({ last_name: e.target.value })}
        required
        {...fieldProps}
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        disabled={disabled}
        onChange={(e) => onChange({ email: e.target.value })}
        required
        {...fieldProps}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
      <TextField
        label="Date of birth"
        type="date"
        value={date_of_birth}
        disabled={disabled}
        onChange={(e) => onChange({ date_of_birth: e.target.value || null })}
        slotProps={{ inputLabel: { shrink: true } }}
        {...fieldProps}
      />
      <TextField
        label="Sex"
        select
        value={sex}
        disabled={disabled}
        onChange={(e) => onChange({ sex: e.target.value || null })}
        {...fieldProps}
      >
        <MenuItem value="">—</MenuItem>
        <MenuItem value="male">Male</MenuItem>
        <MenuItem value="female">Female</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>
      <TextField
        label="Blood type"
        value={blood_type}
        disabled={disabled}
        onChange={(e) => onChange({ blood_type: e.target.value || null })}
        {...fieldProps}
      />
      <TextField
        label="Weight (kg)"
        type="number"
        slotProps={{ htmlInput: { step: "0.1" } }}
        value={weight_kg}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            weight_kg: e.target.value === "" ? null : Number(e.target.value),
          })
        }
        {...fieldProps}
      />
      <TextField
        label="Height (cm)"
        type="number"
        slotProps={{ htmlInput: { step: "0.1" } }}
        value={height_cm}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            height_cm: e.target.value === "" ? null : Number(e.target.value),
          })
        }
        {...fieldProps}
      />
      <TextField
        label="Phone"
        value={phone}
        disabled={disabled}
        onChange={(e) => onChange({ phone: e.target.value || null })}
        {...fieldProps}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
      <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
        <TypographyFieldLabel>Address</TypographyFieldLabel>
        <TextField
          placeholder="Street"
          value={address.street}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              address: { ...address, street: e.target.value },
            })
          }
          {...fieldProps}
          sx={{ mt: 1 }}
        />
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            mt: 1,
          }}
        >
          <TextField
            placeholder="City"
            value={address.city}
            disabled={disabled}
            onChange={(e) =>
              onChange({ address: { ...address, city: e.target.value } })
            }
            {...fieldProps}
          />
          <TextField
            placeholder="State"
            value={address.state}
            disabled={disabled}
            onChange={(e) =>
              onChange({ address: { ...address, state: e.target.value } })
            }
            {...fieldProps}
          />
          <TextField
            placeholder="ZIP"
            value={address.zip}
            disabled={disabled}
            onChange={(e) =>
              onChange({ address: { ...address, zip: e.target.value } })
            }
            {...fieldProps}
          />
        </Box>
      </Box>
    </Box>
  );
}

function TypographyFieldLabel({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ typography: "caption", fontWeight: 600, color: "text.secondary" }}>
      {children}
    </Box>
  );
}
