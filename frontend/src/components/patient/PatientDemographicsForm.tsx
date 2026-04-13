import type { Address } from "../../types/patient";

interface Props {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  sex: string;
  blood_type: string;
  weight_kg: string;
  height_cm: string;
  phone: string;
  address: Address;
  disabled?: boolean;
  onChange: (patch: Record<string, unknown>) => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 " +
  "focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 " +
  "disabled:bg-gray-50 disabled:text-gray-500";

export default function PatientDemographicsForm({
  first_name,
  last_name,
  email,
  date_of_birth,
  sex,
  blood_type,
  weight_kg,
  height_cm,
  phone,
  address,
  disabled,
  onChange,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-1">
        <span className="text-xs font-medium text-gray-600">First name</span>
        <input
          className={inputClass}
          value={first_name}
          disabled={disabled}
          onChange={(e) => onChange({ first_name: e.target.value })}
          required
        />
      </label>
      <label className="block sm:col-span-1">
        <span className="text-xs font-medium text-gray-600">Last name</span>
        <input
          className={inputClass}
          value={last_name}
          disabled={disabled}
          onChange={(e) => onChange({ last_name: e.target.value })}
          required
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-gray-600">Email</span>
        <input
          type="email"
          className={inputClass}
          value={email}
          disabled={disabled}
          onChange={(e) => onChange({ email: e.target.value })}
          required
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Date of birth</span>
        <input
          type="date"
          className={inputClass}
          value={date_of_birth}
          disabled={disabled}
          onChange={(e) => onChange({ date_of_birth: e.target.value || null })}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Sex</span>
        <select
          className={inputClass}
          value={sex}
          disabled={disabled}
          onChange={(e) => onChange({ sex: e.target.value || null })}
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Blood type</span>
        <input
          className={inputClass}
          value={blood_type}
          disabled={disabled}
          onChange={(e) => onChange({ blood_type: e.target.value || null })}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Weight (kg)</span>
        <input
          type="number"
          step="0.1"
          className={inputClass}
          value={weight_kg}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              weight_kg: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Height (cm)</span>
        <input
          type="number"
          step="0.1"
          className={inputClass}
          value={height_cm}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              height_cm: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-gray-600">Phone</span>
        <input
          className={inputClass}
          value={phone}
          disabled={disabled}
          onChange={(e) => onChange({ phone: e.target.value || null })}
        />
      </label>
      <div className="sm:col-span-2 space-y-2">
        <p className="text-xs font-medium text-gray-600">Address</p>
        <input
          placeholder="Street"
          className={inputClass}
          value={address.street}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              address: { ...address, street: e.target.value },
            })
          }
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            placeholder="City"
            className={inputClass}
            value={address.city}
            disabled={disabled}
            onChange={(e) =>
              onChange({ address: { ...address, city: e.target.value } })
            }
          />
          <input
            placeholder="State"
            className={inputClass}
            value={address.state}
            disabled={disabled}
            onChange={(e) =>
              onChange({ address: { ...address, state: e.target.value } })
            }
          />
          <input
            placeholder="ZIP"
            className={inputClass}
            value={address.zip}
            disabled={disabled}
            onChange={(e) =>
              onChange({ address: { ...address, zip: e.target.value } })
            }
          />
        </div>
      </div>
    </div>
  );
}
