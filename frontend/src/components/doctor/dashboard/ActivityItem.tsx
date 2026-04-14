import { MessageCircle, Pill } from "lucide-react";
import type { RecentActivityItem } from "../../../types/doctor";
import { formatRelativeShort } from "./formatRelative";

export default function ActivityItem({ item }: { item: RecentActivityItem }) {
  const Icon = item.type === "chat" ? MessageCircle : Pill;
  const label = item.type === "chat" ? "Chat" : "Prescription";
  return (
    <li className="flex gap-3 border-b border-gray-100 py-3 last:border-0">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {label} with {item.patient_name}
          <span className="font-normal text-gray-500">
            {" "}
            · {formatRelativeShort(item.timestamp)}
          </span>
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
      </div>
    </li>
  );
}
