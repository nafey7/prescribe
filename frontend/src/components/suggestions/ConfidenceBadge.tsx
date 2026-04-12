import type { ConfidenceLevel } from "../../types/suggestion";

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; dot: string; bg: string; text: string }
> = {
  high: {
    label: "High",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  low: {
    label: "Low",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
  },
};

export default function ConfidenceBadge({
  level,
}: {
  level: ConfidenceLevel;
}) {
  const c = CONFIG[level] ?? CONFIG.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
