import { useCallback, useRef, useState } from "react";
import { sendMessageStream } from "../api/chat";
import type { Message } from "../types/chat";

export function useChat(patientId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setError(null);
      tokenBufferRef.current = "";

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

      const flushTokenBuffer = () => {
        const buffered = tokenBufferRef.current;
        if (!buffered) return;
        tokenBufferRef.current = "";
        updateLast((msg) => ({
          ...msg,
          isThinking: false,
          isStreaming: true,
          content: msg.content + buffered,
        }));
      };

      const scheduleFlush = () => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          flushTokenBuffer();
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
            tokenBufferRef.current += token;
            scheduleFlush();
          },
          onDone: (newChatId, messageId) => {
            if (rafIdRef.current !== null) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            flushTokenBuffer();
            setChatId(newChatId);
            updateLast((msg) => ({
              ...msg,
              messageId,
              isStreaming: false,
              isThinking: false,
            }));
          },
          onError: (errMsg) => {
            if (rafIdRef.current !== null) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            tokenBufferRef.current = "";
            setError(errMsg);
            updateLast((msg) => ({
              ...msg,
              isThinking: false,
              isStreaming: false,
              content: `⚠️ Error: ${errMsg}. Please try again.`,
            }));
          },
        });
      } catch (err) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        tokenBufferRef.current = "";
        const errMsg =
          err instanceof Error ? err.message : "Failed to get response";
        setError(errMsg);
        updateLast((msg) => ({
          ...msg,
          isThinking: false,
          isStreaming: false,
          content: `⚠️ Error: ${errMsg}. Please try again.`,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, chatId, isLoading]
  );

  const clearChat = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    tokenBufferRef.current = "";
    setMessages([]);
    setChatId(undefined);
    setError(null);
  }, []);

  return { messages, chatId, isLoading, error, sendMessage, clearChat };
}
