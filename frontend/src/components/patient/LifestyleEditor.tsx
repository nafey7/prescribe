import type { Lifestyle } from "../../types/patient";

interface Props {
  value: Lifestyle;
  disabled?: boolean;
  onChange: (next: Lifestyle) => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50";
const taClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 min-h-[72px]";

export default function LifestyleEditor({ value, disabled, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Smoking status</span>
        <select
          className={inputClass}
          value={value.smoking_status}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, smoking_status: e.target.value })
          }
        >
          <option value="unknown">Unknown</option>
          <option value="never">Never</option>
          <option value="former">Former</option>
          <option value="current">Current</option>
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-gray-600">Smoking notes</span>
        <textarea
          className={taClass}
          value={value.smoking_notes}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, smoking_notes: e.target.value })
          }
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-gray-600">Alcohol</span>
        <input
          className={inputClass}
          value={value.alcohol}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, alcohol: e.target.value })}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-gray-600">Exercise</span>
        <input
          className={inputClass}
          value={value.exercise}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, exercise: e.target.value })}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-gray-600">Diet notes</span>
        <textarea
          className={taClass}
          value={value.diet_notes}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, diet_notes: e.target.value })}
        />
      </label>
    </div>
  );
}
