import { Plus, Trash2 } from "lucide-react";
import type { Condition } from "../../types/patient";

interface Props {
  items: Condition[];
  disabled?: boolean;
  onChange: (items: Condition[]) => void;
}

const inputClass =
  "w-full rounded border border-gray-200 px-2 py-1.5 text-sm disabled:bg-gray-50";

export default function ConditionsEditor({ items, disabled, onChange }: Props) {
  const update = (index: number, patch: Partial<Condition>) => {
    const next = items.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((c, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-12"
        >
          <label className="sm:col-span-4">
            <span className="text-xs text-gray-500">Name</span>
            <input
              className={inputClass}
              value={c.name}
              disabled={disabled}
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-gray-500">Year</span>
            <input
              type="number"
              className={inputClass}
              value={c.diagnosed_year ?? ""}
              disabled={disabled}
              onChange={(e) =>
                update(i, {
                  diagnosed_year:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-gray-500">Status</span>
            <select
              className={inputClass}
              value={c.status}
              disabled={disabled}
              onChange={(e) => update(i, { status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="resolved">resolved</option>
              <option value="managed">managed</option>
            </select>
          </label>
          <label className="sm:col-span-3">
            <span className="text-xs text-gray-500">Notes</span>
            <input
              className={inputClass}
              value={c.notes}
              disabled={disabled}
              onChange={(e) => update(i, { notes: e.target.value })}
            />
          </label>
          <div className="flex items-end justify-end sm:col-span-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove condition"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...items,
            {
              name: "",
              diagnosed_year: null,
              status: "active",
              notes: "",
            },
          ])
        }
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700"
      >
        <Plus size={16} /> Add condition
      </button>
    </div>
  );
}
