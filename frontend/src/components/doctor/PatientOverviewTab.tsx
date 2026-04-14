import AllergiesCard from "../dashboard/AllergiesCard";
import ConditionsCard from "../dashboard/ConditionsCard";
import FamilyHistoryCard from "../dashboard/FamilyHistoryCard";
import LabResultsCard from "../dashboard/LabResultsCard";
import LifestyleCard from "../dashboard/LifestyleCard";
import MedicalTimeline from "../dashboard/MedicalTimeline";
import MedicationsTable from "../dashboard/MedicationsTable";
import PatientSummaryCard from "../dashboard/PatientSummaryCard";
import RecentDocumentsCard from "../dashboard/RecentDocumentsCard";
import type { MedicalHistory } from "../../types/patient";

interface Props {
  data: MedicalHistory;
  patientId: string;
}

export default function PatientOverviewTab({ data, patientId }: Props) {
  const docsBase = `/doctor/patients/${encodeURIComponent(patientId)}/documents`;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      <div className="lg:col-span-2">
        <PatientSummaryCard summary={data.summary} />
      </div>

      <ConditionsCard conditions={data.conditions} />
      <AllergiesCard allergies={data.allergies} />

      <div className="lg:col-span-2">
        <MedicationsTable medications={data.medications} />
      </div>

      <div className="lg:col-span-2">
        <LabResultsCard lab_reports={data.lab_reports} />
      </div>

      <div className="lg:col-span-2">
        <MedicalTimeline events={data.medical_events} />
      </div>

      <div className="lg:col-span-2">
        <RecentDocumentsCard
          documents={data.recent_documents}
          viewAllTo={docsBase}
        />
      </div>

      <FamilyHistoryCard family_history={data.family_history} />
      <LifestyleCard lifestyle={data.lifestyle} />
    </div>
  );
}
