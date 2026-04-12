import { Plus, Trash2 } from "lucide-react";
import type { FamilyHistoryEntry } from "../../types/patient";

interface Props {
  items: FamilyHistoryEntry[];
  disabled?: boolean;
  onChange: (items: FamilyHistoryEntry[]) => void;
}

const inputClass =
  "w-full rounded border border-gray-200 px-2 py-1.5 text-sm disabled:bg-gray-50";

export default function FamilyHistoryEditor({
  items,
  disabled,
  onChange,
}: Props) {
  const update = (index: number, patch: Partial<FamilyHistoryEntry>) => {
    const next = items.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1">
            <span className="text-xs text-gray-500">Relation</span>
            <input
              className={inputClass}
              value={f.relation}
              disabled={disabled}
              onChange={(e) => update(i, { relation: e.target.value })}
            />
          </label>
          <label className="flex-[2]">
            <span className="text-xs text-gray-500">Condition / notes</span>
            <input
              className={inputClass}
              value={f.condition}
              disabled={disabled}
              onChange={(e) => update(i, { condition: e.target.value })}
            />
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove entry"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...items, { relation: "", condition: "" }])}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700"
      >
        <Plus size={16} /> Add family history
      </button>
    </div>
  );
}
