import type { ChangeEvent } from "react";
import type { OfficeAddress } from "../../../types/doctor";

type Props = {
  email: string;
  phone: string;
  office_address: OfficeAddress;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

export default function DoctorContactForm({
  email,
  phone,
  office_address,
  disabled,
  onChange,
}: Props) {
  const addr =
    (field: keyof OfficeAddress) => (e: ChangeEvent<HTMLInputElement>) => {
      onChange({
        office_address: { ...office_address, [field]: e.target.value },
      });
    };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Email <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ email: e.target.value })
            }
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Phone
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ phone: e.target.value })
            }
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
      </div>
      <p className="text-xs font-medium text-gray-600">Office address</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-gray-500">Street</span>
          <input
            type="text"
            value={office_address.street}
            onChange={addr("street")}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">City</span>
          <input
            type="text"
            value={office_address.city}
            onChange={addr("city")}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">State</span>
          <input
            type="text"
            value={office_address.state}
            onChange={addr("state")}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-gray-500">ZIP</span>
          <input
            type="text"
            value={office_address.zip}
            onChange={addr("zip")}
            disabled={disabled}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
      </div>
    </div>
  );
}
