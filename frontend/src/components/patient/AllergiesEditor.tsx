import { Plus, Trash2 } from "lucide-react";
import type { Allergy } from "../../types/patient";

interface Props {
  items: Allergy[];
  disabled?: boolean;
  onChange: (items: Allergy[]) => void;
}

const inputClass =
  "w-full rounded border border-gray-200 px-2 py-1.5 text-sm disabled:bg-gray-50";

export default function AllergiesEditor({ items, disabled, onChange }: Props) {
  const update = (index: number, patch: Partial<Allergy>) => {
    const next = items.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((a, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1">
            <span className="text-xs text-gray-500">Substance</span>
            <input
              className={inputClass}
              value={a.substance}
              disabled={disabled}
              onChange={(e) => update(i, { substance: e.target.value })}
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-gray-500">Reaction</span>
            <input
              className={inputClass}
              value={a.reaction}
              disabled={disabled}
              onChange={(e) => update(i, { reaction: e.target.value })}
            />
          </label>
          <label className="w-full sm:w-32">
            <span className="text-xs text-gray-500">Documented</span>
            <input
              className={inputClass}
              value={a.documented_date}
              disabled={disabled}
              onChange={(e) => update(i, { documented_date: e.target.value })}
            />
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            aria-label="Remove allergy"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...items,
            { substance: "", reaction: "", documented_date: "" },
          ])
        }
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700"
      >
        <Plus size={16} /> Add allergy
      </button>
    </div>
  );
}
