import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}

export default function PatientSearchBar({ value, onChange, id }: Props) {
  return (
    <div className="relative min-w-[200px] flex-1 sm:max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={18}
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name…"
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        autoComplete="off"
      />
    </div>
  );
}
