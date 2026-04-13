import { ChevronDown, UserRound } from "lucide-react";
import { usePatients } from "../contexts/PatientContext";

interface PatientSelectorProps {
  selectedId: string;
  onChange: (patientId: string) => void;
  /** Accessible label for the select (defaults to hidden “Active patient”). */
  ariaLabel?: string;
}

export default function PatientSelector({
  selectedId,
  onChange,
  ariaLabel = "Active patient",
}: PatientSelectorProps) {
  const { patients, isLoading } = usePatients();

  const selected = patients.find((p) => p.id === selectedId);

  return (
    <div className="flex items-center gap-2">
      <UserRound size={16} className="text-gray-500" />
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading || patients.length === 0}
          aria-label={ariaLabel}
          className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 
                     text-sm font-medium text-gray-700 cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     hover:border-gray-400 transition-colors
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
      {isLoading && (
        <span className="text-xs text-gray-400">Loading…</span>
      )}
      {!isLoading && !selected && patients.length > 0 && (
        <span className="text-xs text-amber-600">Unknown patient</span>
      )}
    </div>
  );
}
