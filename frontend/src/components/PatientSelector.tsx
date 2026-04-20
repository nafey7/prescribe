import { UserRound } from "lucide-react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { usePatients } from "../contexts/PatientContext";

interface PatientSelectorProps {
  selectedId: string;
  onChange: (patientId: string) => void;
  /** Accessible label for the select (defaults to hidden “Active patient”). */
  ariaLabel?: string;
}

export default function PatientSelector({
  selectedId,
  onChange,
  ariaLabel = "Active patient",
}: PatientSelectorProps) {
  const { patients, isLoading } = usePatients();

  const selected = patients.find((p) => p.id === selectedId);
  const selectValue = patients.some((p) => p.id === selectedId) ? selectedId : "";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ color: "text.secondary", display: "flex" }}>
        <UserRound size={16} aria-hidden />
      </Box>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select
          value={selectValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading || patients.length === 0}
          displayEmpty
          inputProps={{ "aria-label": ariaLabel }}
        >
          {patients.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {isLoading && (
        <Typography variant="caption" color="text.disabled">
          Loading…
        </Typography>
      )}
      {!isLoading &&
        Boolean(selectedId) &&
        selectValue === "" &&
        patients.length > 0 && (
        <Typography variant="caption" color="warning.main">
          Unknown patient
        </Typography>
      )}
    </Box>
  );
}
