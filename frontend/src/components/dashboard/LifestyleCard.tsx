import { Leaf } from "lucide-react";
import type { Lifestyle } from "../../types/patient";

interface Props {
  lifestyle: Lifestyle | null;
}

export default function LifestyleCard({ lifestyle }: Props) {
  if (!lifestyle) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
        <div className="mb-3 flex items-center gap-2">
          <Leaf className="text-emerald-600" size={18} />
          <h2 className="text-base font-semibold text-gray-900">Lifestyle</h2>
        </div>
        <p className="text-sm text-gray-500">Not recorded.</p>
      </section>
    );
  }

  const rows: { label: string; value: string }[] = [];
  if (lifestyle.smoking_status && lifestyle.smoking_status !== "unknown") {
    rows.push({
      label: "Smoking",
      value: lifestyle.smoking_notes || lifestyle.smoking_status,
    });
  } else if (lifestyle.smoking_notes) {
    rows.push({ label: "Smoking", value: lifestyle.smoking_notes });
  }
  if (lifestyle.alcohol) rows.push({ label: "Alcohol", value: lifestyle.alcohol });
  if (lifestyle.exercise) rows.push({ label: "Exercise", value: lifestyle.exercise });
  if (lifestyle.diet_notes) rows.push({ label: "Diet", value: lifestyle.diet_notes });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
      <div className="mb-3 flex items-center gap-2">
        <Leaf className="text-emerald-600" size={18} />
        <h2 className="text-base font-semibold text-gray-900">Lifestyle</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No lifestyle details recorded.</p>
      ) : (
        <dl className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-gray-500">{r.label}</dt>
              <dd className="text-gray-900">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
