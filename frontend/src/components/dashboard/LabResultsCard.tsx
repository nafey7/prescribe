import { FlaskConical } from "lucide-react";
import type { MedicalHistoryLabReport } from "../../types/patient";

interface Props {
  lab_reports: MedicalHistoryLabReport[];
}

function indicator(status: string) {
  const s = status.toLowerCase();
  if (s === "elevated" || s === "critical") {
    return <span className="text-red-600 font-semibold">↑</span>;
  }
  if (s === "low") {
    return <span className="text-blue-600 font-semibold">↓</span>;
  }
  return null;
}

function valueClass(status: string) {
  const s = status.toLowerCase();
  if (s === "elevated" || s === "critical") return "text-red-700 font-medium";
  if (s === "low") return "text-blue-700 font-medium";
  return "text-gray-900";
}

export default function LabResultsCard({ lab_reports }: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="text-emerald-600" size={18} />
        <h2 className="text-base font-semibold text-gray-900">
          Recent lab results
        </h2>
      </div>
      {lab_reports.length === 0 ? (
        <p className="text-sm text-gray-500">No lab results in record file.</p>
      ) : (
        <div className="space-y-5">
          {lab_reports.map((report) => (
            <div key={report.date}>
              <p className="mb-2 text-sm font-medium text-gray-700">
                {report.date}
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {report.results.map((r) => (
                  <li
                    key={r.name}
                    className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-gray-50 px-2 py-1"
                  >
                    <span className="text-gray-600">{r.name}:</span>
                    <span className={valueClass(r.status)}>
                      {r.value}
                    </span>
                    {indicator(r.status)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
