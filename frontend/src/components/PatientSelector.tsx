import { ChevronDown, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getPatients } from "../api/chat";
import type { Patient } from "../types/chat";

interface PatientSelectorProps {
  selectedId: string;
  onChange: (patientId: string) => void;
}

export default function PatientSelector({
  selectedId,
  onChange,
}: PatientSelectorProps) {
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(() => {
        setPatients([
          { id: "john_doe", name: "John Doe", file: "patient_john_doe.md" },
          { id: "jane_smith", name: "Jane Smith", file: "patient_jane_smith.md" },
          { id: "alex_kumar", name: "Alex Kumar", file: "patient_alex_kumar.md" },
        ]);
      });
  }, []);

  const selected = patients.find((p) => p.id === selectedId);

  return (
    <div className="flex items-center gap-2">
      <UserRound size={16} className="text-gray-500" />
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 
                     text-sm font-medium text-gray-700 cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     hover:border-gray-400 transition-colors"
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
    </div>
  );
}
