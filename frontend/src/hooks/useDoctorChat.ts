import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDoctorChatHistory,
  getDoctorChatSessions,
  sendDoctorChatMessageStream,
} from "../api/doctors";
import type { ChatSessionSummary } from "../types/doctor";
import type { Message } from "../types/chat";

function normalizeTimestamp(ts: string | Date): string {
  if (typeof ts === "string") return ts;
  return new Date(ts).toISOString();
}

export function useDoctorChat(doctorId: string | null, patientId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const refreshSessions = useCallback(async () => {
    if (!doctorId || !patientId) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    try {
      const list = await getDoctorChatSessions(doctorId, patientId);
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [doctorId, patientId]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const loadHistory = useCallback(
    async (cid: string) => {
      if (!doctorId || !patientId) return;
      setHistoryLoading(true);
      setError(null);
      try {
        const data = await getDoctorChatHistory(doctorId, cid);
        setChatId(data.chat_id);
        setMessages(
          data.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: normalizeTimestamp(m.timestamp),
          }))
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load chat";
        setError(msg);
        setMessages([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [doctorId, patientId]
  );

  const selectSession = useCallback(
    (cid: string) => {
      void loadHistory(cid);
    },
    [loadHistory]
  );

  const newChat = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    tokenBufferRef.current = "";
    setMessages([]);
    setChatId(undefined);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !doctorId || !patientId) return;

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
        await sendDoctorChatMessageStream(doctorId, patientId, text, chatId, {
          onThinking: (status) => {
            updateLast((msg) => {
              if (msg.isStreaming || msg.content || tokenBufferRef.current)
                return msg;
              return {
                ...msg,
                isThinking: true,
                thinkingStatus: status,
              };
            });
          },
          onToken: (token) => {
            tokenBufferRef.current += token;
            scheduleFlush();
          },
          onDone: (newChatId, _messageId) => {
            if (rafIdRef.current !== null) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            flushTokenBuffer();
            setChatId(newChatId);
            updateLast((msg) => ({
              ...msg,
              isStreaming: false,
              isThinking: false,
            }));
            void refreshSessions();
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
    [doctorId, patientId, chatId, isLoading, refreshSessions]
  );

  const pairReady = useRef(false);
  useEffect(() => {
    if (!pairReady.current) {
      pairReady.current = true;
      return;
    }
    newChat();
  }, [doctorId, patientId, newChat]);

  return {
    messages,
    chatId,
    sessions,
    sessionsLoading,
    historyLoading,
    isLoading,
    error,
    sendMessage,
    newChat,
    selectSession,
    refreshSessions,
  };
}
