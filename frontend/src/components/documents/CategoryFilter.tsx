import type { DocumentCategory } from "../../types/document";
import { DOCUMENT_CATEGORY_LABELS } from "../../types/document";

const ORDER: DocumentCategory[] = [
  "lab_result",
  "imaging",
  "prescription",
  "clinical_note",
  "insurance",
  "other",
];

interface Props {
  value: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          value === "all"
            ? "bg-emerald-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {ORDER.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            value === cat
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {DOCUMENT_CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
