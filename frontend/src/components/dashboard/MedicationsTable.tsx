import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { MedicalHistoryMedication } from "../../types/patient";

type SortKey = "name" | "dosage" | "frequency" | "since";

interface Props {
  medications: MedicalHistoryMedication[];
}

export default function MedicationsTable({ medications }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const rows = [...medications];
    rows.sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [medications, sortKey, sortDir]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const icon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={14} className="opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    );
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Current medications
      </h2>
      {medications.length === 0 ? (
        <p className="text-sm text-gray-500">No medications listed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="pb-2 pr-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggle("name")}
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                  >
                    Medication {icon("name")}
                  </button>
                </th>
                <th className="pb-2 pr-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggle("dosage")}
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                  >
                    Dosage {icon("dosage")}
                  </button>
                </th>
                <th className="pb-2 pr-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggle("frequency")}
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                  >
                    Frequency {icon("frequency")}
                  </button>
                </th>
                <th className="pb-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggle("since")}
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                  >
                    Since {icon("since")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr
                  key={`${m.name}-${m.since ?? ""}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-2 pr-2 font-medium text-gray-900">
                    {m.name}
                  </td>
                  <td className="py-2 pr-2 text-gray-700">{m.dosage}</td>
                  <td className="py-2 pr-2 text-gray-700">{m.frequency}</td>
                  <td className="py-2 text-gray-600">{m.since ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
