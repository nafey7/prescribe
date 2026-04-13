import { Info } from "lucide-react";

export default function DuplicateIndicator({
  description,
}: {
  description: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
      <Info size={16} className="mt-0.5 shrink-0" />
      <span>Already in your profile — {description}</span>
    </div>
  );
}
