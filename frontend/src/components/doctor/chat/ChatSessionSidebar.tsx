import { MessageSquare, Plus } from "lucide-react";
import { formatRelativeShort } from "../dashboard/formatRelative";
import type { ChatSessionSummary } from "../../../types/doctor";

interface ChatSessionSidebarProps {
  sessions: ChatSessionSummary[];
  selectedChatId: string | undefined;
  onSelect: (chatId: string) => void;
  onNew: () => void;
  isLoading: boolean;
}

export default function ChatSessionSidebar({
  sessions,
  selectedChatId,
  onSelect,
  onNew,
  isLoading,
}: ChatSessionSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:w-56 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <MessageSquare size={16} className="text-teal-700" aria-hidden />
          History
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700"
        >
          <Plus size={14} aria-hidden />
          New
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <p className="px-2 py-3 text-xs text-gray-500">Loading sessions…</p>
        )}
        {!isLoading && sessions.length === 0 && (
          <p className="px-2 py-3 text-xs text-gray-500">
            No chats yet. Send a message to start.
          </p>
        )}
        <ul className="space-y-1">
          {sessions.map((s) => {
            const active = selectedChatId === s.chat_id;
            const label = formatRelativeShort(s.updated_at) || "Session";
            return (
              <li key={s.chat_id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.chat_id)}
                  className={[
                    "w-full rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-teal-100 font-medium text-teal-900"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  <span className="block truncate">{label}</span>
                  <span className="block truncate font-mono text-[10px] text-gray-400">
                    {s.chat_id.slice(0, 8)}…
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
