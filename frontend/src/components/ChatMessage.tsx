import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../types/chat";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-primary-600 text-white"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary-600 text-white rounded-tr-sm"
            : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-table:my-2">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        <p
          className={`text-xs mt-1.5 ${isUser ? "text-primary-200" : "text-gray-400"}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
