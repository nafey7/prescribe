import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getConnectedPatientProfile } from "../../api/doctors";
import { useIdentity } from "../../contexts/IdentityContext";
import { paths } from "../../router/paths";

/**
 * Sub-navigation when viewing a specific patient under `/doctor/patients/:patientId/*`.
 */
export default function PatientContextBar({ patientId }: { patientId: string }) {
  const { currentDoctorId } = useIdentity();
  const base = paths.doctor.patientDetail(encodeURIComponent(patientId));
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentDoctorId || !patientId) {
      setDisplayName(null);
      return;
    }
    let cancelled = false;
    getConnectedPatientProfile(currentDoctorId, patientId)
      .then((p) => {
        if (cancelled) return;
        const n = `${p.first_name} ${p.last_name}`.trim();
        setDisplayName(n || null);
      })
      .catch(() => {
        if (!cancelled) setDisplayName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDoctorId, patientId]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    [
      "rounded-md px-3 py-1.5 text-sm transition-colors",
      isActive
        ? "bg-teal-100 font-medium text-teal-900"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    ].join(" ");

  const label =
    displayName ||
    (patientId.length > 12 ? `${patientId.slice(0, 8)}…` : patientId);

  return (
    <div className="shrink-0 border-b border-teal-100 bg-teal-50/80 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <NavLink
            to={paths.doctor.patients}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal-900 hover:text-teal-700"
          >
            <ArrowLeft size={16} aria-hidden />
            Back to Patients
          </NavLink>
          <span className="hidden text-gray-300 sm:inline" aria-hidden>
            |
          </span>
          <p className="min-w-0 truncate text-sm text-gray-700">
            <span className="font-medium text-gray-900">Viewing:</span>{" "}
            <span title={patientId}>{label}</span>
          </p>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Patient section">
          <NavLink to={base} end className={tabClass}>
            Overview
          </NavLink>
          <NavLink to={`${base}/documents`} className={tabClass}>
            Documents
          </NavLink>
          <NavLink to={`${base}/chat`} className={tabClass}>
            Chat
          </NavLink>
          <NavLink to={`${base}/prescriptions`} className={tabClass}>
            Prescriptions
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
