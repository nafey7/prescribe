import type { EmergencyContact } from "../../types/patient";

interface Props {
  value: EmergencyContact;
  disabled?: boolean;
  onChange: (next: EmergencyContact) => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 " +
  "focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 " +
  "disabled:bg-gray-50";

export default function EmergencyContactForm({
  value,
  disabled,
  onChange,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block sm:col-span-1">
        <span className="text-xs font-medium text-gray-600">Name</span>
        <input
          className={inputClass}
          value={value.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </label>
      <label className="block sm:col-span-1">
        <span className="text-xs font-medium text-gray-600">Relationship</span>
        <input
          className={inputClass}
          value={value.relationship}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, relationship: e.target.value })}
        />
      </label>
      <label className="block sm:col-span-1">
        <span className="text-xs font-medium text-gray-600">Phone</span>
        <input
          className={inputClass}
          value={value.phone}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
      </label>
    </div>
  );
}
