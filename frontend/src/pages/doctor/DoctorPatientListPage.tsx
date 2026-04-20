import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PatientCard from "../../components/doctor/PatientCard";
import PatientSearchBar from "../../components/doctor/PatientSearchBar";
import PatientSortControl from "../../components/doctor/PatientSortControl";
import { useIdentity } from "../../contexts/IdentityContext";
import { useConnectedPatients } from "../../hooks/useConnectedPatients";

const PAGE_SIZE = 12;

export default function DoctorPatientListPage() {
  const { currentDoctorId } = useIdentity();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "last_visit">("recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      300
    );
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort]);

  const { data, isLoading, error } = useConnectedPatients(currentDoctorId, {
    search: debouncedSearch,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (!currentDoctorId) {
    return (
      <Alert severity="warning">
        Select a doctor in the dev identity bar to view connected patients.
      </Alert>
    );
  }

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: { sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          My Patients
          {data != null && (
            <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
              ({data.total})
            </Typography>
          )}
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 3, flexWrap: "wrap", alignItems: { sm: "flex-end" } }}
      >
        <PatientSearchBar
          id="doctor-patient-search"
          value={searchInput}
          onChange={setSearchInput}
        />
        <PatientSortControl
          id="doctor-patient-sort"
          value={sort}
          onChange={setSort}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          {error}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ mt: 5, display: "flex", justifyContent: "center", color: "text.secondary" }}>
          <CircularProgress size={36} />
        </Box>
      )}

      {!isLoading && data && data.patients.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 5, textAlign: "center" }}>
          No connected patients match your filters. Connect with patients from
          the Connections page.
        </Typography>
      )}

      {!isLoading && data && data.patients.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 4 }}>
          {data.patients.map((p) => (
            <Box component="li" key={p.patient_id} sx={{ mb: 1.5 }}>
              <PatientCard patient={p} />
            </Box>
          ))}
        </Box>
      )}

      {!isLoading && data && data.total > PAGE_SIZE && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 4, alignItems: "center", justifyContent: "center" }}
        >
          <Button
            type="button"
            variant="outlined"
            size="small"
            startIcon={<ChevronLeft size={18} />}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Typography variant="body2" color="text.secondary">
            Page {page} of {totalPages}
          </Typography>
          <Button
            type="button"
            variant="outlined"
            size="small"
            endIcon={<ChevronRight size={18} />}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </Stack>
      )}
    </>
  );
}
