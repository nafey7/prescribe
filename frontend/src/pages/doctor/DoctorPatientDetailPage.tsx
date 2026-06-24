import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Sparkles } from "lucide-react";
import { useGeneratePreVisitBriefMutation } from "../../api/doctorsApi";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";
import PatientOverviewTab from "../../components/doctor/PatientOverviewTab";
import ClinicalNotesPanel from "../../components/doctor/ClinicalNotesPanel";
import PreVisitBriefCard from "../../components/doctor/PreVisitBriefCard";
import { useIdentity } from "../../contexts/IdentityContext";
import { usePatientDetail } from "../../hooks/usePatientDetail";
import { useScrollToHash } from "../../hooks/useScrollToHash";
import { rtkErrorMessage } from "../../lib/rtkErrorMessage";
import type { PreVisitBrief } from "../../types/doctor";

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
  const [brief, setBrief] = useState<PreVisitBrief | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const briefScopeRef = useRef("");
  const [generateBrief, { isLoading: isGeneratingBrief }] =
    useGeneratePreVisitBriefMutation();
  useScrollToHash(Boolean(history && !isLoading));

  useEffect(() => {
    briefScopeRef.current = `${currentDoctorId ?? ""}:${patientId ?? ""}`;
    setBrief(null);
    setBriefError(null);
  }, [currentDoctorId, patientId]);

  async function handleGenerateBrief() {
    if (!currentDoctorId || !patientId) return;
    const requestScope = `${currentDoctorId}:${patientId}`;
    setBriefError(null);
    try {
      const result = await generateBrief({
        doctorId: currentDoctorId,
        patientId,
      }).unwrap();
      if (briefScopeRef.current === requestScope) setBrief(result);
    } catch (err) {
      if (briefScopeRef.current === requestScope) {
        setBriefError(rtkErrorMessage(err));
      }
    }
  }

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
        <Stack
          component="header"
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3, alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {`${profile.first_name} ${profile.last_name}`.trim() || "Patient"}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={
              isGeneratingBrief ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Sparkles size={17} />
              )
            }
            disabled={isGeneratingBrief}
            onClick={() => void handleGenerateBrief()}
          >
            {brief ? "Regenerate brief" : "Generate AI brief"}
          </Button>
        </Stack>
      )}

      {briefError && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {briefError}
        </Alert>
      )}

      {!isLoading && brief && <PreVisitBriefCard brief={brief} />}

      {!isLoading && history && patientId && (
        <>
          <PatientOverviewTab data={history} patientId={patientId} />
          <ClinicalNotesPanel doctorId={currentDoctorId} patientId={patientId} />
        </>
      )}
    </>
  );
}
