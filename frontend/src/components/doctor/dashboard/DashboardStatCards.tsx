import { Link } from "react-router-dom";
import type { DashboardStats } from "../../../types/doctor";

export default function DashboardStatCards({
  stats,
}: {
  stats: DashboardStats | undefined;
}) {
  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-gray-200/80"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Connected patients
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">
          {stats.connected_patients}
        </p>
        <Link
          to="/doctor/patients"
          className="mt-3 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          View all →
        </Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Pending requests
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">
          {stats.pending_requests}
        </p>
        <Link
          to="/doctor/connections"
          className="mt-3 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          Review →
        </Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Total prescriptions
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">
          {stats.total_prescriptions}
        </p>
        <p className="mt-3 text-sm text-gray-400">All time</p>
      </div>
    </div>
  );
}
