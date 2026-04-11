import { Bot, User } from "lucide-react";
import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types/chat";

interface ChatMessageProps {
  message: Message;
}

const remarkPlugins = [remarkGfm];

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-gray-900 mt-4 mb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-gray-900 mt-4 mb-1.5 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-1.5 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 ml-4 list-disc space-y-0.5 marker:text-gray-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-0.5 marker:text-gray-500">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-3 border-primary-300 pl-3 text-gray-600 italic">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className={className}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 p-3 rounded-lg bg-gray-50 border border-gray-200 overflow-x-auto text-xs">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-gray-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-gray-600 border-t border-gray-100">
      {children}
    </td>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-600 underline decoration-primary-300 hover:decoration-primary-500"
    >
      {children}
    </a>
  ),
};

function ChatMessageInner({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const content = useMemo(
    () => message.content,
    [message.content],
  );

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
          <div className="text-sm leading-relaxed max-w-none chat-markdown">
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="streaming-cursor" aria-hidden="true" />
            )}
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

const ChatMessage = memo(ChatMessageInner, (prev, next) => {
  const p = prev.message;
  const n = next.message;
  return (
    p.content === n.content &&
    p.isStreaming === n.isStreaming &&
    p.isThinking === n.isThinking &&
    p.thinkingStatus === n.thinkingStatus
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
