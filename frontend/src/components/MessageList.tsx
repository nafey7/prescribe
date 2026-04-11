import { Stethoscope } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { Message } from "../types/chat";
import ChatMessage from "./ChatMessage";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

function ThinkingIndicator({ status }: { status?: string }) {
  return (
    <div className="flex gap-3 thinking-enter">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700">
        <Stethoscope size={16} />
      </div>
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full thinking-dot" />
            <span className="text-sm font-medium text-gray-700">
              Thinking...
            </span>
          </div>
          {status && status !== "Thinking..." && (
            <p className="text-xs text-gray-500 ml-4">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <Stethoscope size={32} className="text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Medical AI Assistant
      </h3>
      <p className="text-gray-500 max-w-md text-sm leading-relaxed">
        Ask a question about your patient's health, symptoms, medications, or
        medical history. The AI will reference their medical records to provide
        informed responses.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {[
          "What medications is this patient currently on?",
          "Are there any drug interactions to worry about?",
          "Summarize the patient's medical history",
        ].map((suggestion) => (
          <span
            key={suggestion}
            className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full"
          >
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
}

const SCROLL_THROTTLE_MS = 100;

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStreamingRef = useRef(false);

  const lastMessage = messages[messages.length - 1];
  const isStreaming = !!lastMessage?.isStreaming;
  const showThinking = !!lastMessage?.isThinking;

  isStreamingRef.current = isStreaming;

  const scrollToBottom = useCallback((instant?: boolean) => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({
      behavior: instant ? "instant" : "smooth",
    });
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      scrollToBottom(false);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastScrollRef.current;

    if (elapsed >= SCROLL_THROTTLE_MS) {
      lastScrollRef.current = now;
      scrollToBottom(true);
    } else if (scrollTimeoutRef.current === null) {
      const delay = SCROLL_THROTTLE_MS - elapsed;
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        lastScrollRef.current = Date.now();
        scrollToBottom(true);
      }, delay);
    }

    return () => {
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [messages, isLoading, isStreaming, scrollToBottom]);

  if (messages.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, i) =>
        msg.isThinking ? null : (
          <ChatMessage key={`${msg.timestamp}-${i}`} message={msg} />
        )
      )}
      {showThinking && (
        <ThinkingIndicator status={lastMessage.thinkingStatus} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
