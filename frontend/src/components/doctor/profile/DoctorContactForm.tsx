import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { OfficeAddress } from "../../../types/doctor";

type Props = {
  email: string;
  phone: string;
  office_address: OfficeAddress;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

const fieldProps = { size: "small" as const, fullWidth: true };

export default function DoctorContactForm({
  email,
  phone,
  office_address,
  disabled,
  onChange,
}: Props) {
  const addr =
    (field: keyof OfficeAddress) => (e: ChangeEvent<HTMLInputElement>) => {
      onChange({
        office_address: { ...office_address, [field]: e.target.value },
      });
    };

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
          label="Email"
          type="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ email: e.target.value })
          }
          disabled={disabled}
          required
          {...fieldProps}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <TextField
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ phone: e.target.value })
          }
          disabled={disabled}
          {...fieldProps}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
      </Box>
      <Box component="p" sx={{ typography: "caption", fontWeight: 600, color: "text.secondary", m: 0 }}>
        Office address
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
        }}
      >
        <TextField
          label="Street"
          value={office_address.street}
          onChange={addr("street")}
          disabled={disabled}
          {...fieldProps}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <TextField
          label="City"
          value={office_address.city}
          onChange={addr("city")}
          disabled={disabled}
          {...fieldProps}
        />
        <TextField
          label="State"
          value={office_address.state}
          onChange={addr("state")}
          disabled={disabled}
          {...fieldProps}
        />
        <TextField
          label="ZIP"
          value={office_address.zip}
          onChange={addr("zip")}
          disabled={disabled}
          {...fieldProps}
          sx={{ maxWidth: { sm: 200 } }}
        />
      </Box>
    </Stack>
  );
}
