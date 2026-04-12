import { ShieldAlert } from "lucide-react";
import PatientSelector from "./PatientSelector";
import { usePatientContext } from "../contexts/PatientContext";

/**
 * Sticky dev-only bar: acting-as patient switcher. Stripped in production builds.
 */
export default function DevIdentityBanner() {
  const { currentPatientId, setCurrentPatientId } = usePatientContext();

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 shrink-0 border-b border-amber-300 bg-amber-100 px-4 py-2 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-amber-950">
          <ShieldAlert size={16} className="shrink-0" aria-hidden />
          <p className="text-xs">
            <strong>DEV MODE</strong> — Acting as:{" "}
            <span className="text-amber-800">
              (picker only, not authentication). Educational prototype.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs font-medium text-amber-900 sm:inline">
            Patient
          </span>
          <PatientSelector
            selectedId={currentPatientId}
            onChange={setCurrentPatientId}
            ariaLabel="Switch active patient"
          />
        </div>
      </div>
    </div>
  );
}
