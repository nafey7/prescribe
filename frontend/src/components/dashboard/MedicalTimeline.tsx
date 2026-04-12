import { History } from "lucide-react";
import type { MedicalHistoryEvent } from "../../types/patient";

interface Props {
  events: MedicalHistoryEvent[];
}

export default function MedicalTimeline({ events }: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <History className="text-emerald-600" size={18} />
        <h2 className="text-base font-semibold text-gray-900">
          Medical history
        </h2>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No past events listed.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li
              key={`${e.year}-${e.description}`}
              className="flex gap-3 border-l-2 border-emerald-200 pl-3"
            >
              <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-emerald-800">
                {e.year}
              </span>
              <span className="text-sm text-gray-800">{e.description}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
