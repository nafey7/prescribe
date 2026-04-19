import { useMemo } from "react";
import { useParams } from "react-router-dom";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";
import PatientOverviewTab from "../../components/doctor/PatientOverviewTab";
import { useIdentity } from "../../contexts/IdentityContext";
import { usePatientDetail } from "../../hooks/usePatientDetail";

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export default function DoctorPatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentDoctorId } = useIdentity();
  const { profile, history, isLoading, error } = usePatientDetail(
    currentDoctorId,
    patientId
  );

  const subtitle = useMemo(() => {
    if (!profile) return null;
    const parts: string[] = [];
    if (profile.sex) parts.push(profile.sex);
    const age = ageFromDob(profile.date_of_birth);
    if (age != null) parts.push(`${age}`);
    if (profile.blood_type) parts.push(`${profile.blood_type}`);
    if (profile.weight_kg != null && profile.height_cm != null) {
      parts.push(`${profile.weight_kg}kg / ${profile.height_cm}cm`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [profile]);

  if (!currentDoctorId) {
    return (
      <p className="text-sm text-amber-900">
        Select a doctor in the dev identity bar to view this patient.
      </p>
    );
  }

  if (!patientId) {
    return <p className="text-gray-600">Missing patient.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {isLoading && <DashboardSkeleton />}

      {!isLoading && profile && (
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {`${profile.first_name} ${profile.last_name}`.trim() || "Patient"}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </header>
      )}

      {!isLoading && history && patientId && (
        <PatientOverviewTab data={history} patientId={patientId} />
      )}
    </div>
  );
}
