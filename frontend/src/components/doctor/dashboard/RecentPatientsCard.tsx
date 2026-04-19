import { Link } from "react-router-dom";
import type { RecentPatientSummary } from "../../../types/doctor";
import { formatRelativeShort } from "./formatRelative";

function initials(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

export default function RecentPatientsCard({
  patients,
}: {
  patients: RecentPatientSummary[];
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Recent patients</h2>
      {patients.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          When you have active connections, recently active patients will show
          here.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => {
            const display = [p.first_name, p.last_name].filter(Boolean).join(" ");
            const demo = [p.sex, p.age != null ? `${p.age}` : ""]
              .filter(Boolean)
              .join(", ");
            const last = p.last_interaction
              ? formatRelativeShort(p.last_interaction)
              : null;
            return (
              <li key={p.patient_id}>
                <Link
                  to={`/doctor/patients/${encodeURIComponent(p.patient_id)}`}
                  className="block rounded-xl border border-gray-100 bg-gray-50/80 p-4 transition hover:border-teal-200 hover:bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-900">
                      {initials(p.first_name, p.last_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {display || "Patient"}
                      </p>
                      {demo ? (
                        <p className="text-xs text-gray-500">{demo}</p>
                      ) : null}
                      {last ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Last: {last}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">
                          No recent activity
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4">
        <Link
          to="/doctor/patients"
          className="text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          View all patients →
        </Link>
      </div>
    </section>
  );
}
