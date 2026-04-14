import { ChevronDown, ShieldAlert, Stethoscope, UserRound } from "lucide-react";
import PatientSelector from "./PatientSelector";
import { useIdentity } from "../contexts/IdentityContext";
import { usePatientContext } from "../contexts/PatientContext";
import type { DoctorInfo } from "../types/doctor";

/**
 * Sticky dev-only bar: role switch + acting-as identity. Stripped in production builds.
 */
export default function DevIdentityBanner() {
  const {
    currentRole,
    setCurrentRole,
    currentDoctorId,
    setCurrentDoctorId,
    doctors,
    isDoctorsLoading,
    doctorsError,
    currentDoctor,
  } = useIdentity();
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
            <strong>DEV MODE</strong> — Role:{" "}
            <span className="text-amber-800">
              (picker only, not authentication). Educational prototype.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-amber-900">Role</span>
            <div className="relative">
              <select
                value={currentRole}
                onChange={(e) =>
                  setCurrentRole(e.target.value as "patient" | "doctor")
                }
                aria-label="Switch dev role"
                className="appearance-none rounded-lg border border-amber-400/80 bg-white py-1.5 pl-2 pr-7 text-xs font-medium text-amber-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-800/70"
              />
            </div>
          </div>

          {currentRole === "patient" && (
            <div className="flex items-center gap-2 border-l border-amber-300/80 pl-2">
              <span className="hidden text-xs font-medium text-amber-900 sm:inline">
                Acting as
              </span>
              <UserRound size={16} className="text-amber-900/80" aria-hidden />
              <PatientSelector
                selectedId={currentPatientId}
                onChange={setCurrentPatientId}
                ariaLabel="Switch active patient"
              />
            </div>
          )}

          {currentRole === "doctor" && (
            <div className="flex items-center gap-2 border-l border-amber-300/80 pl-2">
              <span className="hidden text-xs font-medium text-amber-900 sm:inline">
                Acting as
              </span>
              <Stethoscope size={16} className="text-amber-900/80" aria-hidden />
              <DoctorIdentityPicker
                doctors={doctors}
                selectedId={currentDoctorId ?? ""}
                onChange={setCurrentDoctorId}
                isLoading={isDoctorsLoading}
                error={doctorsError}
                currentDoctor={currentDoctor}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DoctorIdentityPicker({
  doctors,
  selectedId,
  onChange,
  isLoading,
  error,
  currentDoctor,
}: {
  doctors: DoctorInfo[];
  selectedId: string;
  onChange: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  currentDoctor: DoctorInfo | null;
}) {
  const selected = doctors.find((d) => d.id === selectedId);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading || doctors.length === 0}
          aria-label="Switch active doctor"
          className="appearance-none rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.specialization ? ` — ${d.specialization}` : ""}
              {d.institution ? ` · ${d.institution}` : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
      {isLoading && <span className="text-xs text-gray-500">Loading…</span>}
      {error && (
        <span className="max-w-[140px] truncate text-xs text-red-600" title={error}>
          {error}
        </span>
      )}
      {!isLoading && !selected && doctors.length > 0 && (
        <span className="text-xs text-amber-600">Unknown doctor</span>
      )}
      {!isLoading && currentDoctor && (
        <span className="hidden max-w-[180px] truncate text-xs text-amber-900/90 lg:inline">
          {currentDoctor.specialization}
        </span>
      )}
    </div>
  );
}
