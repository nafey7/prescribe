import type { DoctorDashboardResponse } from "../../../types/doctor";

export default function DoctorWelcomeBanner({
  data,
}: {
  data: DoctorDashboardResponse | null;
}) {
  if (!data) return null;
  const sub = [data.specialization, data.institution].filter(Boolean).join(" · ");
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-lg font-semibold text-gray-900">
        Welcome, {data.doctor_name}
      </p>
      {sub ? (
        <p className="mt-1 text-sm text-gray-600">{sub}</p>
      ) : (
        <p className="mt-1 text-sm text-gray-500">Your practice overview</p>
      )}
    </div>
  );
}
