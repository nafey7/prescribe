import { useIdentity } from "../../contexts/IdentityContext";
import DashboardStatCards from "../../components/doctor/dashboard/DashboardStatCards";
import DoctorWelcomeBanner from "../../components/doctor/dashboard/DoctorWelcomeBanner";
import PendingRequestsCard from "../../components/doctor/dashboard/PendingRequestsCard";
import RecentActivityCard from "../../components/doctor/dashboard/RecentActivityCard";
import RecentPatientsCard from "../../components/doctor/dashboard/RecentPatientsCard";
import { useDoctorDashboard } from "../../hooks/useDoctorDashboard";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-gray-200/80" />
      <DashboardStatCards stats={undefined} />
      <div className="h-48 animate-pulse rounded-2xl bg-gray-200/80" />
      <div className="h-56 animate-pulse rounded-2xl bg-gray-200/80" />
      <div className="h-48 animate-pulse rounded-2xl bg-gray-200/80" />
    </div>
  );
}

export default function DoctorDashboardPage() {
  const { currentDoctorId } = useIdentity();
  const { data, isLoading, error } = useDoctorDashboard();

  if (!currentDoctorId) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-amber-800">
          Select a doctor in the dev identity bar to load your overview.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="sr-only">Doctor dashboard</h1>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DoctorWelcomeBanner data={data} />
          <DashboardStatCards stats={data?.stats} />
          <div className="grid gap-6 lg:grid-cols-1">
            <PendingRequestsCard items={data?.pending_requests ?? []} />
            <RecentPatientsCard patients={data?.recent_patients ?? []} />
            <RecentActivityCard items={data?.recent_activity ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
