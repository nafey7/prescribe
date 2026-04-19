import { ChevronRight, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
import type { ConnectedPatientSummary } from "../../types/doctor";

function initials(p: ConnectedPatientSummary): string {
  const a = p.first_name?.trim().charAt(0) ?? "";
  const b = p.last_name?.trim().charAt(0) ?? "";
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

function formatConnected(since: string): string {
  if (!since) return "—";
  const d = new Date(since);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return since;
}

function formatLastVisit(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PatientCard({ patient }: { patient: ConnectedPatientSummary }) {
  const inn = initials(patient);
  const name =
    `${patient.first_name} ${patient.last_name}`.trim() || "Patient";
  const demo: string[] = [];
  if (patient.sex) demo.push(patient.sex);
  if (patient.age != null) demo.push(`${patient.age}`);
  const conditions =
    patient.conditions.length > 0
      ? patient.conditions.slice(0, 3).join(", ")
      : "None reported";

  return (
    <Link
      to={paths.doctor.patientDetail(
        encodeURIComponent(patient.patient_id)
      )}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:border-teal-200 hover:shadow-md"
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
          {inn ? (
            <span aria-hidden>{inn}</span>
          ) : (
            <UserRound size={22} className="text-teal-700" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">{name}</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {demo.length > 0 ? `${demo.join(" · ")} · ` : ""}
            {conditions}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Connected since {formatConnected(patient.connected_since)}
          </p>
          <p className="text-xs text-gray-500">
            Last visited: {formatLastVisit(patient.last_interaction)}
          </p>
        </div>
        <div className="flex shrink-0 items-center self-center text-teal-700">
          <span className="sr-only">View patient</span>
          <ChevronRight size={20} aria-hidden />
        </div>
      </div>
    </Link>
  );
}
