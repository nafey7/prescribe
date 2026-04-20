import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

interface Props {
  value: "recent" | "name" | "last_visit";
  onChange: (v: "recent" | "name" | "last_visit") => void;
  id?: string;
}

export default function PatientSortControl({ value, onChange, id }: Props) {
  const labelId = id ? `${id}-label` : "patient-sort-label";
  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id={labelId}>Sort</InputLabel>
      <Select
        id={id}
        labelId={labelId}
        label="Sort"
        value={value}
        onChange={(e) =>
          onChange(e.target.value as "recent" | "name" | "last_visit")
        }
      >
        <MenuItem value="recent">Recently connected</MenuItem>
        <MenuItem value="name">Alphabetical (A–Z)</MenuItem>
        <MenuItem value="last_visit">Last visited</MenuItem>
      </Select>
    </FormControl>
  );
}
