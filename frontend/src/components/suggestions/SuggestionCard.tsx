import { useState } from "react";
import { Check, X, FlaskConical, Pill, AlertTriangle, HeartPulse } from "lucide-react";
import type { Suggestion, SuggestionCategory } from "../../types/suggestion";
import ConfidenceBadge from "./ConfidenceBadge";
import DuplicateIndicator from "./DuplicateIndicator";

const CATEGORY_CONFIG: Record<
  SuggestionCategory,
  { icon: typeof FlaskConical; label: string; color: string }
> = {
  lab_result: { icon: FlaskConical, label: "Lab Result", color: "text-violet-600" },
  medication: { icon: Pill, label: "Medication", color: "text-blue-600" },
  allergy: { icon: AlertTriangle, label: "Allergy", color: "text-amber-600" },
  condition: { icon: HeartPulse, label: "Condition", color: "text-rose-600" },
};

function formatExtractedData(
  category: SuggestionCategory,
  data: Record<string, unknown>
): React.ReactNode {
  if (category === "condition") {
    const year = data.diagnosed_year ? ` (${data.diagnosed_year})` : "";
    const status = data.status ? ` — ${data.status}` : "";
    return (
      <div>
        <p className="font-medium text-gray-900">
          {String(data.name || "Unknown")}
          {year}
        </p>
        {(Boolean(status) || (data.notes != null && String(data.notes) !== "")) && (
          <p className="mt-0.5 text-sm text-gray-600">
            {status.trim()}
            {data.notes != null && data.notes !== ""
              ? ` ${String(data.notes)}`
              : ""}
          </p>
        )}
      </div>
    );
  }

  if (category === "allergy") {
    return (
      <div>
        <p className="font-medium text-gray-900">
          {String(data.substance || "Unknown")}
        </p>
        {data.reaction != null && String(data.reaction) !== "" && (
          <p className="mt-0.5 text-sm text-gray-600">
            Reaction: {String(data.reaction)}
          </p>
        )}
      </div>
    );
  }

  if (category === "medication") {
    const parts = [data.name, data.dosage, data.frequency]
      .filter(Boolean)
      .map(String);
    return (
      <div>
        <p className="font-medium text-gray-900">{parts.join(" — ")}</p>
        {data.since != null && String(data.since) !== "" && (
          <p className="mt-0.5 text-sm text-gray-600">
            Since: {String(data.since)}
          </p>
        )}
      </div>
    );
  }

  if (category === "lab_result") {
    const results = Array.isArray(data.results) ? data.results : [];
    return (
      <div>
        {data.date != null && String(data.date) !== "" && (
          <p className="mb-1 text-sm font-medium text-gray-700">
            Date: {String(data.date)}
          </p>
        )}
        {results.map((r: Record<string, unknown>, i: number) => (
          <div key={i} className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-gray-900">
              {String(r.name || "")}:
            </span>
            <span
              className={
                r.status === "elevated" || r.status === "abnormal"
                  ? "font-semibold text-red-600"
                  : "text-gray-700"
              }
            >
              {String(r.value || "")}
            </span>
            {r.reference_range != null && String(r.reference_range) !== "" && (
              <span className="text-gray-400">
                (ref: {String(r.reference_range)})
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <pre className="text-xs text-gray-600">{JSON.stringify(data, null, 2)}</pre>;
}

interface Props {
  suggestion: Suggestion;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export default function SuggestionCard({ suggestion, onAccept, onReject }: Props) {
  const [acting, setActing] = useState<"accept" | "reject" | null>(null);
  const [exiting, setExiting] = useState(false);

  const cfg = CATEGORY_CONFIG[suggestion.category] ?? CATEGORY_CONFIG.condition;
  const Icon = cfg.icon;
  const isDuplicate = !!suggestion.duplicate_of;

  const handleAction = async (action: "accept" | "reject") => {
    setActing(action);
    try {
      setExiting(true);
      await new Promise((r) => setTimeout(r, 200));
      if (action === "accept") {
        await onAccept(suggestion.suggestion_id);
      } else {
        await onReject(suggestion.suggestion_id);
      }
    } catch {
      setExiting(false);
    } finally {
      setActing(null);
    }
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 ${
        exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className={cfg.color} />
          <span className={`text-sm font-semibold ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <ConfidenceBadge level={suggestion.confidence} />
      </div>

      <div className="mb-3">
        {formatExtractedData(suggestion.category, suggestion.extracted_data)}
      </div>

      {isDuplicate && (
        <div className="mb-3">
          <DuplicateIndicator description={suggestion.duplicate_of!} />
        </div>
      )}

      {suggestion.source_text && (
        <details className="mb-3 text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            View source text
          </summary>
          <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-600">
            &ldquo;{suggestion.source_text}&rdquo;
          </p>
        </details>
      )}

      <div className="flex items-center justify-end gap-2">
        {isDuplicate ? (
          <>
            <span className="mr-auto text-xs text-gray-400">Already added</span>
            <button
              type="button"
              onClick={() => void handleAction("reject")}
              disabled={acting !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Dismiss
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleAction("reject")}
              disabled={acting !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <X size={14} />
              Reject
            </button>
            <button
              type="button"
              onClick={() => void handleAction("accept")}
              disabled={acting !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={14} />
              Accept
            </button>
          </>
        )}
      </div>
    </div>
  );
}
