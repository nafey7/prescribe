import { Users } from "lucide-react";
import type { FamilyHistoryEntry } from "../../types/patient";

interface Props {
  family_history: FamilyHistoryEntry[];
}

export default function FamilyHistoryCard({ family_history }: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
      <div className="mb-3 flex items-center gap-2">
        <Users className="text-emerald-600" size={18} />
        <h2 className="text-base font-semibold text-gray-900">
          Family history
        </h2>
      </div>
      {family_history.length === 0 ? (
        <p className="text-sm text-gray-500">None recorded.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {family_history.map((f) => (
            <li key={`${f.relation}-${f.condition}`}>
              <span className="font-medium text-gray-800">{f.relation}:</span>{" "}
              <span className="text-gray-700">{f.condition}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
