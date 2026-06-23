import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import AllergiesCard from "../components/dashboard/AllergiesCard";
import ConditionsCard from "../components/dashboard/ConditionsCard";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import FamilyHistoryCard from "../components/dashboard/FamilyHistoryCard";
import LabResultsCard from "../components/dashboard/LabResultsCard";
import LifestyleCard from "../components/dashboard/LifestyleCard";
import MedicalTimeline from "../components/dashboard/MedicalTimeline";
import MedicationsTable from "../components/dashboard/MedicationsTable";
import PatientSummaryCard from "../components/dashboard/PatientSummaryCard";
import RecentDocumentsCard from "../components/dashboard/RecentDocumentsCard";
import { useMedicalHistory } from "../hooks/useMedicalHistory";
import { useScrollToHash } from "../hooks/useScrollToHash";

export default function DashboardPage() {
  const { data, isLoading, error } = useMedicalHistory();
  useScrollToHash(Boolean(data && !isLoading));

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      )}

      {isLoading && <DashboardSkeleton />}

      {!isLoading && data && (
        <Grid container spacing={{ xs: 2, lg: 2.5 }}>
          <Grid size={12}>
            <PatientSummaryCard summary={data.summary} />
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <ConditionsCard conditions={data.conditions} />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <AllergiesCard allergies={data.allergies} />
          </Grid>

          <Grid size={12}>
            <MedicationsTable medications={data.medications} />
          </Grid>

          <Grid size={12}>
            <LabResultsCard lab_reports={data.lab_reports} />
          </Grid>

          <Grid size={12}>
            <MedicalTimeline events={data.medical_events} />
          </Grid>

          <Grid size={12}>
            <RecentDocumentsCard documents={data.recent_documents} />
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <FamilyHistoryCard family_history={data.family_history} />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <LifestyleCard lifestyle={data.lifestyle} />
          </Grid>
        </Grid>
      )}
    </>
  );
}
