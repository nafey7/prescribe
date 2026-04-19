interface Props {
  value: "recent" | "name" | "last_visit";
  onChange: (v: "recent" | "name" | "last_visit") => void;
  id?: string;
}

export default function PatientSortControl({ value, onChange, id }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm text-gray-600">
        Sort
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) =>
          onChange(e.target.value as "recent" | "name" | "last_visit")
        }
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
      >
        <option value="recent">Recently connected</option>
        <option value="name">Alphabetical (A–Z)</option>
        <option value="last_visit">Last visited</option>
      </select>
    </div>
  );
}
