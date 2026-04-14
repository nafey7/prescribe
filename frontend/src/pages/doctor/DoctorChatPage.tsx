import { MessageSquare, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ChatInput from "../../components/ChatInput";
import ChatSessionSidebar from "../../components/doctor/chat/ChatSessionSidebar";
import MessageList from "../../components/MessageList";
import { useIdentity } from "../../contexts/IdentityContext";
import { getConnectedPatientProfile } from "../../api/doctors";
import { useDoctorChat } from "../../hooks/useDoctorChat";

export default function DoctorChatPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentDoctorId } = useIdentity();
  const [patientLabel, setPatientLabel] = useState<string | null>(null);

  const {
    messages,
    chatId,
    sessions,
    sessionsLoading,
    historyLoading,
    isLoading,
    sendMessage,
    newChat,
    selectSession,
  } = useDoctorChat(currentDoctorId, patientId ?? null);

  useEffect(() => {
    if (!currentDoctorId || !patientId) {
      setPatientLabel(null);
      return;
    }
    let cancelled = false;
    getConnectedPatientProfile(currentDoctorId, patientId)
      .then((p) => {
        if (cancelled) return;
        const n = `${p.first_name} ${p.last_name}`.trim();
        setPatientLabel(n || null);
      })
      .catch(() => {
        if (!cancelled) setPatientLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDoctorId, patientId]);

  if (!currentDoctorId) {
    return (
      <p className="text-sm text-amber-900">
        Select a doctor in the dev identity bar to use AI chat.
      </p>
    );
  }

  if (!patientId) {
    return <p className="text-gray-600">Missing patient.</p>;
  }

  const titleName = patientLabel || patientId;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <div className="flex items-center gap-2 text-amber-900">
          <ShieldAlert size={16} className="shrink-0" aria-hidden />
          <p className="text-xs">
            <strong>Educational prototype</strong> — not medical advice. Always
            confirm with the care team.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:h-[min(640px,calc(100dvh-13rem))] md:flex-row">
        <ChatSessionSidebar
          sessions={sessions}
          selectedChatId={chatId}
          onSelect={selectSession}
          onNew={newChat}
          isLoading={sessionsLoading}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
                <MessageSquare className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">
                  AI Medical Assistant
                </h1>
                <p className="text-xs text-gray-500">
                  Patient: {titleName}
                  {historyLoading ? " · Loading history…" : null}
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>

          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
