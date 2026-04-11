import { RotateCcw, ShieldAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import PatientSelector from "./PatientSelector";

export default function ChatPage() {
  const [patientId, setPatientId] = useState("john_doe");
  const { messages, isLoading, sendMessage, clearChat } = useChat(patientId);

  const handlePatientChange = useCallback(
    (newPatientId: string) => {
      setPatientId(newPatientId);
      clearChat();
    },
    [clearChat]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-amber-800">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <p className="text-xs">
            <strong>Prototype only.</strong> Not real medical advice. Always
            consult a qualified healthcare professional.
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-lg">🩺</span>
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

          <div className="flex items-center gap-3">
            <PatientSelector
              selectedId={patientId}
              onChange={handlePatientChange}
            />
            <button
              onClick={clearChat}
              title="New conversation"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Messages: full-width scroll surface so wheel/trackpad works on side margins; content stays max-w-3xl */}
      <main className="flex-1 flex min-h-0 w-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>
        </div>
      </main>

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
