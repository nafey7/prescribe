import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

type Props = {
  first_name: string;
  last_name: string;
  title: string;
  specialization: string;
  sub_specializations: string;
  bio: string;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

const fieldProps = { size: "small" as const, fullWidth: true };

export default function DoctorProfessionalForm({
  first_name,
  last_name,
  title,
  specialization,
  sub_specializations,
  bio,
  disabled,
  onChange,
}: Props) {
  const handle =
    (field: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value });
    };

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        }}
      >
        <TextField
          label="Title"
          value={title}
          onChange={handle("title")}
          disabled={disabled}
          {...fieldProps}
        />
        <TextField
          label="First name"
          value={first_name}
          onChange={handle("first_name")}
          disabled={disabled}
          required
          {...fieldProps}
        />
        <TextField
          label="Last name"
          value={last_name}
          onChange={handle("last_name")}
          disabled={disabled}
          required
          {...fieldProps}
        />
      </Box>
      <TextField
        label="Specialization"
        value={specialization}
        onChange={handle("specialization")}
        disabled={disabled}
        required
        {...fieldProps}
      />
      <TextField
        label="Sub-specializations (comma-separated)"
        value={sub_specializations}
        onChange={handle("sub_specializations")}
        disabled={disabled}
        placeholder="e.g. Endocrinology, Hypertension"
        {...fieldProps}
      />
      <TextField
        label="Bio"
        value={bio}
        onChange={handle("bio")}
        disabled={disabled}
        multiline
        minRows={4}
        {...fieldProps}
      />
    </Stack>
  );
}
