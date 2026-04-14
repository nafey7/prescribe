import { Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Education } from "../../../types/doctor";

type Props = {
  items: Education[];
  disabled: boolean;
  onChange: (items: Education[]) => void;
};

export default function DoctorEducationEditor({
  items,
  disabled,
  onChange,
}: Props) {
  const patch = (index: number, field: keyof Education, value: string) => {
    const next = items.map((row, i) => {
      if (i !== index) return row;
      if (field === "year") {
        const t = value.trim();
        return {
          ...row,
          year: t === "" ? null : Number(t),
        };
      }
      return { ...row, [field]: value };
    });
    onChange(next);
  };

  const add = () => {
    onChange([
      ...items,
      { degree: "", institution: "", year: null },
    ]);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3 sm:flex-row sm:items-end"
        >
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Degree
            </span>
            <input
              type="text"
              value={row.degree}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch(index, "degree", e.target.value)
              }
              disabled={disabled}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </label>
          <label className="min-w-0 flex-[2]">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Institution
            </span>
            <input
              type="text"
              value={row.institution}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch(index, "institution", e.target.value)
              }
              disabled={disabled}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </label>
          <label className="w-24 shrink-0">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Year
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={row.year ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch(index, "year", e.target.value)
              }
              disabled={disabled}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </label>
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={disabled}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Remove education row"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <Plus size={16} />
        Add education
      </button>
    </div>
  );
}
