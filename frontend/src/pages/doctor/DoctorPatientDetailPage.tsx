import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";
import PatientOverviewTab from "../../components/doctor/PatientOverviewTab";
import ClinicalNotesPanel from "../../components/doctor/ClinicalNotesPanel";
import { useIdentity } from "../../contexts/IdentityContext";
import { usePatientDetail } from "../../hooks/usePatientDetail";
import { useScrollToHash } from "../../hooks/useScrollToHash";

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
  useScrollToHash(Boolean(history && !isLoading));

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
      <Typography variant="body2" color="warning.dark">
        Select a doctor in the dev identity bar to view this patient.
      </Typography>
    );
  }

  if (!patientId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Missing patient.
      </Typography>
    );
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      )}

      {isLoading && <DashboardSkeleton />}

      {!isLoading && profile && (
        <Box component="header" sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {`${profile.first_name} ${profile.last_name}`.trim() || "Patient"}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {!isLoading && history && patientId && (
        <>
          <PatientOverviewTab data={history} patientId={patientId} />
          <ClinicalNotesPanel doctorId={currentDoctorId} patientId={patientId} />
        </>
      )}
    </>
  );
}
