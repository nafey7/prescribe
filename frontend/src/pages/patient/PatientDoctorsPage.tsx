import { Stethoscope } from "lucide-react";

/**
 * `/patient/doctors` — placeholder for the patient's "my doctors" surface.
 *
 * Phase 3 ships the route with an empty state so deep links and the sidebar
 * entry resolve cleanly. The full UX (connected doctors list + request
 * connection CTA wired through `connectionsApi` / `doctorsApi`) lands in a
 * follow-up phase.
 */
export default function PatientDoctorsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Stethoscope size={24} aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">My Doctors</h2>
        <p className="mt-2 text-sm text-gray-600">
          See the doctors you are connected to and request new connections.
          Coming soon.
        </p>
      </div>
    </div>
  );
}
