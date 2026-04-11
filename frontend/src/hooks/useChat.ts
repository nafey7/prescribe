import { useCallback, useState } from "react";
import { sendMessage as apiSendMessage } from "../api/chat";
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
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await apiSendMessage(text, patientId, chatId);
        setChatId(response.chat_id);

        const assistantMessage: Message = {
          role: "assistant",
          content: response.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Failed to get response";
        setError(errMsg);

        const errorMessage: Message = {
          role: "assistant",
          content: `⚠️ Error: ${errMsg}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
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
