import { AlertTriangle } from "lucide-react";
import type { Allergy } from "../../types/patient";

interface Props {
  allergies: Allergy[];
}

export default function AllergiesCard({ allergies }: Props) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm h-full">
      <div className="mb-3 flex items-center gap-2 text-amber-900">
        <AlertTriangle size={18} />
        <h2 className="text-base font-semibold">Allergies</h2>
      </div>
      {allergies.length === 0 ? (
        <p className="text-sm text-amber-900/70">No known allergies recorded.</p>
      ) : (
        <ul className="space-y-2">
          {allergies.map((a) => (
            <li key={a.substance} className="text-sm">
              <span className="font-semibold text-amber-950">{a.substance}</span>
              {a.reaction ? (
                <span className="text-amber-900/90"> — {a.reaction}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
