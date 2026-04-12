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

export default function DashboardPage() {
  const { data, isLoading, error } = useMedicalHistory();

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

      {!isLoading && data && (
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
            <RecentDocumentsCard documents={data.recent_documents} />
          </div>

          <FamilyHistoryCard family_history={data.family_history} />
          <LifestyleCard lifestyle={data.lifestyle} />
        </div>
      )}
    </div>
  );
}
