import { User } from "lucide-react";
import type { PatientSummary } from "../../types/patient";

interface Props {
  summary: PatientSummary;
}

export default function PatientSummaryCard({ summary }: Props) {
  const name = `${summary.first_name} ${summary.last_name}`.trim() || "Patient";
  const parts: string[] = [];
  if (summary.age != null) parts.push(`${summary.age} yrs`);
  if (summary.sex) parts.push(summary.sex);
  if (summary.blood_type) parts.push(`Blood ${summary.blood_type}`);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <User size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
          {parts.length > 0 && (
            <p className="mt-0.5 text-sm text-gray-600">{parts.join(" · ")}</p>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {summary.weight_kg != null && (
              <div>
                <dt className="text-gray-500">Weight</dt>
                <dd className="font-medium text-gray-900">
                  {summary.weight_kg} kg
                </dd>
              </div>
            )}
            {summary.height_cm != null && (
              <div>
                <dt className="text-gray-500">Height</dt>
                <dd className="font-medium text-gray-900">
                  {summary.height_cm} cm
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}
