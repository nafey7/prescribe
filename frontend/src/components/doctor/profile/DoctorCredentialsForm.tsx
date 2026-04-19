import type { ChangeEvent } from "react";

type Props = {
  license_number: string;
  license_state: string;
  npi_number: string;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

export default function DoctorCredentialsForm({
  license_number,
  license_state,
  npi_number,
  disabled,
  onChange,
}: Props) {
  const handle =
    (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: e.target.value });
    };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          License number
        </span>
        <input
          type="text"
          value={license_number}
          onChange={handle("license_number")}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          License state
        </span>
        <input
          type="text"
          value={license_state}
          onChange={handle("license_state")}
          disabled={disabled}
          placeholder="e.g. CA"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          NPI number
        </span>
        <input
          type="text"
          value={npi_number}
          onChange={handle("npi_number")}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </label>
    </div>
  );
}
