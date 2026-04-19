import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
      <div className="mx-auto max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Select a doctor in the dev identity bar to view connected patients.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          My Patients
          {data != null && (
            <span className="ml-2 text-lg font-normal text-gray-500">
              ({data.total})
            </span>
          )}
        </h1>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
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
      </div>

      {error && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-10 flex justify-center text-gray-500">
          <Loader2 className="animate-spin" size={36} />
        </div>
      )}

      {!isLoading && data && data.patients.length === 0 && (
        <p className="mt-10 text-center text-gray-600">
          No connected patients match your filters. Connect with patients from
          the Connections page.
        </p>
      )}

      {!isLoading && data && data.patients.length > 0 && (
        <ul className="mt-8 space-y-3">
          {data.patients.map((p) => (
            <li key={p.patient_id}>
              <PatientCard patient={p} />
            </li>
          ))}
        </ul>
      )}

      {!isLoading && data && data.total > PAGE_SIZE && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-gray-600">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
