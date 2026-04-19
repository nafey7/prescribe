import type { ChangeEvent } from "react";

type Props = {
  institution: string;
  department: string;
  years_of_experience: string;
  accepting_new_patients: boolean;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

export default function DoctorInstitutionForm({
  institution,
  department,
  years_of_experience,
  accepting_new_patients,
  disabled,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Institution
          </span>
          <input
            type="text"
            value={institution}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ institution: e.target.value })
            }
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Department
          </span>
          <input
            type="text"
            value={department}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ department: e.target.value })
            }
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <label className="block w-40">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Years of experience
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={years_of_experience}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ years_of_experience: e.target.value })
            }
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={accepting_new_patients}
            onChange={(e) =>
              onChange({ accepting_new_patients: e.target.checked })
            }
            disabled={disabled}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Accepting new patients
        </label>
      </div>
    </div>
  );
}
