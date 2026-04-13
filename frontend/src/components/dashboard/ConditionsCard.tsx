import { Activity } from "lucide-react";
import type { Condition } from "../../types/patient";

interface Props {
  conditions: Condition[];
}

export default function ConditionsCard({ conditions }: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="text-emerald-600" size={18} />
        <h2 className="text-base font-semibold text-gray-900">
          Active conditions
        </h2>
      </div>
      {conditions.length === 0 ? (
        <p className="text-sm text-gray-500">No active conditions recorded.</p>
      ) : (
        <ul className="space-y-2">
          {conditions.map((c) => (
            <li
              key={`${c.name}-${c.diagnosed_year ?? ""}`}
              className="flex flex-wrap items-baseline gap-2"
            >
              <span className="font-medium text-gray-900">{c.name}</span>
              {c.status && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  {c.status}
                </span>
              )}
              {c.diagnosed_year != null && (
                <span className="text-xs text-gray-500">
                  since {c.diagnosed_year}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
