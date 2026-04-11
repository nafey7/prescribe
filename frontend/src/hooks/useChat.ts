import { useCallback, useState } from "react";
import { sendMessageStream } from "../api/chat";
import type { Message } from "../types/chat";

export function useChat(patientId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setError(null);

      const userMessage: Message = {
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };

      const placeholder: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isThinking: true,
        thinkingStatus: "Thinking...",
      };

      setMessages((prev) => [...prev, userMessage, placeholder]);
      setIsLoading(true);

      const updateLast = (updater: (msg: Message) => Message) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = updater(last);
          }
          return updated;
        });
      };

      try {
        await sendMessageStream(text, patientId, chatId, {
          onThinking: (status) => {
            updateLast((msg) => ({
              ...msg,
              isThinking: true,
              thinkingStatus: status,
            }));
          },
          onToken: (token) => {
            updateLast((msg) => ({
              ...msg,
              isThinking: false,
              isStreaming: true,
              content: msg.content + token,
            }));
          },
          onDone: (newChatId) => {
            setChatId(newChatId);
            updateLast((msg) => ({
              ...msg,
              isStreaming: false,
              isThinking: false,
            }));
          },
          onError: (errMsg) => {
            setError(errMsg);
            updateLast((msg) => ({
              ...msg,
              isThinking: false,
              isStreaming: false,
              content: `\u26a0\ufe0f Error: ${errMsg}. Please try again.`,
            }));
          },
        });
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Failed to get response";
        setError(errMsg);
        updateLast((msg) => ({
          ...msg,
          isThinking: false,
          isStreaming: false,
          content: `\u26a0\ufe0f Error: ${errMsg}. Please try again.`,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, chatId, isLoading]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setChatId(undefined);
    setError(null);
  }, []);

  return { messages, chatId, isLoading, error, sendMessage, clearChat };
}
