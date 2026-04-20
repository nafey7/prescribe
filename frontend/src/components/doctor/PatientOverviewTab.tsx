import Box from "@mui/material/Box";
import AllergiesCard from "../dashboard/AllergiesCard";
import ConditionsCard from "../dashboard/ConditionsCard";
import FamilyHistoryCard from "../dashboard/FamilyHistoryCard";
import LabResultsCard from "../dashboard/LabResultsCard";
import LifestyleCard from "../dashboard/LifestyleCard";
import MedicalTimeline from "../dashboard/MedicalTimeline";
import MedicationsTable from "../dashboard/MedicationsTable";
import PatientSummaryCard from "../dashboard/PatientSummaryCard";
import RecentDocumentsCard from "../dashboard/RecentDocumentsCard";
import { paths } from "../../router/paths";
import type { MedicalHistory } from "../../types/patient";

interface Props {
  data: MedicalHistory;
  patientId: string;
}

export default function PatientOverviewTab({ data, patientId }: Props) {
  const docsBase = paths.doctor.patientDocuments(
    encodeURIComponent(patientId)
  );

  return (
    <Box
      sx={{
        display: "grid",
        gap: { xs: 2, lg: 2.5 },
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
      }}
    >
      <Box sx={{ gridColumn: { lg: "1 / -1" } }}>
        <PatientSummaryCard summary={data.summary} />
      </Box>

      <ConditionsCard conditions={data.conditions} />
      <AllergiesCard allergies={data.allergies} />

      <Box sx={{ gridColumn: { lg: "1 / -1" } }}>
        <MedicationsTable medications={data.medications} />
      </Box>

      <Box sx={{ gridColumn: { lg: "1 / -1" } }}>
        <LabResultsCard lab_reports={data.lab_reports} />
      </Box>

      <Box sx={{ gridColumn: { lg: "1 / -1" } }}>
        <MedicalTimeline events={data.medical_events} />
      </Box>

      <Box sx={{ gridColumn: { lg: "1 / -1" } }}>
        <RecentDocumentsCard
          documents={data.recent_documents}
          viewAllTo={docsBase}
        />
      </Box>

      <FamilyHistoryCard family_history={data.family_history} />
      <LifestyleCard lifestyle={data.lifestyle} />
    </Box>
  );
}
