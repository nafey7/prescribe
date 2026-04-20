import { MessageSquare, RotateCcw, UserCircle } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { usePatientContext } from "../contexts/PatientContext";
import { useChat } from "../hooks/useChat";
import { paths } from "../router/paths";
import ChatInput from "./ChatInput";
import DevIdentityBanner from "./DevIdentityBanner";
import MessageList from "./MessageList";
import PatientSelector from "./PatientSelector";

export default function ChatPage() {
  const { currentPatientId, setCurrentPatientId } = usePatientContext();
  const { messages, isLoading, sendMessage, clearChat } =
    useChat(currentPatientId);

  const profileHref = paths.patient.profile;

  const handlePatientChange = useCallback(
    (id: string) => setCurrentPatientId(id),
    [setCurrentPatientId]
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
      {import.meta.env.DEV ? (
        <DevIdentityBanner />
      ) : (
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex w-full justify-end">
            <PatientSelector
              selectedId={currentPatientId}
              onChange={handlePatientChange}
            />
          </div>
        </div>
      )}

      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <MessageSquare className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                Medical AI Chat
              </h1>
              <p className="text-xs text-gray-500">
                Patient record-aware assistant
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={paths.patient.root}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Patient portal
            </Link>
            <Link
              to={profileHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <UserCircle size={16} />
              Profile
            </Link>
            <button
              type="button"
              onClick={clearChat}
              title="New conversation"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <MessageList messages={messages} isLoading={isLoading} />
        </div>
      </main>

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
