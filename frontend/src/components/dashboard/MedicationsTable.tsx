import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { MedicalHistoryMedication } from "../../types/patient";

type SortKey = "name" | "dosage" | "frequency" | "since";

interface Props {
  medications: MedicalHistoryMedication[];
}

export default function MedicationsTable({ medications }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const rows = [...medications];
    rows.sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [medications, sortKey, sortDir]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const icon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={14} style={{ opacity: 0.4 }} />;
    }
    return sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" component="h2" sx={{ mb: 1.5, fontWeight: 600 }}>
        Current medications
      </Typography>
      {medications.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No medications listed.
        </Typography>
      ) : (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => toggle("name")}
                    endIcon={icon("name")}
                    sx={{ color: "text.secondary", textTransform: "none", p: 0, minWidth: 0 }}
                  >
                    Medication
                  </Button>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => toggle("dosage")}
                    endIcon={icon("dosage")}
                    sx={{ color: "text.secondary", textTransform: "none", p: 0, minWidth: 0 }}
                  >
                    Dosage
                  </Button>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => toggle("frequency")}
                    endIcon={icon("frequency")}
                    sx={{ color: "text.secondary", textTransform: "none", p: 0, minWidth: 0 }}
                  >
                    Frequency
                  </Button>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => toggle("since")}
                    endIcon={icon("since")}
                    sx={{ color: "text.secondary", textTransform: "none", p: 0, minWidth: 0 }}
                  >
                    Since
                  </Button>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((m) => (
                <TableRow
                  key={`${m.name}-${m.since ?? ""}`}
                  sx={{ "&:last-child td": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                  <TableCell>{m.dosage}</TableCell>
                  <TableCell>{m.frequency}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{m.since ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
