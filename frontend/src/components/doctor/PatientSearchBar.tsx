import { Search } from "lucide-react";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}

export default function PatientSearchBar({ value, onChange, id }: Props) {
  return (
    <TextField
      id={id}
      type="search"
      size="small"
      placeholder="Search by name…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      sx={{ flex: 1, minWidth: 200, maxWidth: { sm: 400 } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} aria-hidden />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
