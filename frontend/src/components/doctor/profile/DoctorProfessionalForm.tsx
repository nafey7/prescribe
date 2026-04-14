import type { ChangeEvent } from "react";

type Props = {
  first_name: string;
  last_name: string;
  title: string;
  specialization: string;
  sub_specializations: string;
  bio: string;
  disabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
};

export default function DoctorProfessionalForm({
  first_name,
  last_name,
  title,
  specialization,
  sub_specializations,
  bio,
  disabled,
  onChange,
}: Props) {
  const handle =
    (field: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value });
    };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={handle("title")}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            First name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={first_name}
            onChange={handle("first_name")}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Last name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={last_name}
            onChange={handle("last_name")}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          Specialization <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          value={specialization}
          onChange={handle("specialization")}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          Sub-specializations (comma-separated)
        </span>
        <input
          type="text"
          value={sub_specializations}
          onChange={handle("sub_specializations")}
          disabled={disabled}
          placeholder="e.g. Endocrinology, Hypertension"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Bio</span>
        <textarea
          value={bio}
          onChange={handle("bio")}
          disabled={disabled}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </label>
    </div>
  );
}
