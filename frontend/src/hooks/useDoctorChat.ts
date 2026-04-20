import { useCallback, useEffect, useRef, useState } from "react";
import { sendDoctorChatMessageStream } from "../api/chatStream";
import {
  useDeleteDoctorChatMutation,
  useGetDoctorChatSessionsQuery,
  useLazyGetDoctorChatHistoryQuery,
} from "../api/chatApi";
import { baseApi } from "../api/baseApi";
import { useAppDispatch } from "../store/hooks";
import type { Message } from "../types/chat";

function normalizeTimestamp(ts: string | Date): string {
  if (typeof ts === "string") return ts;
  return new Date(ts).toISOString();
}

export function useDoctorChat(doctorId: string | null, patientId: string | null) {
  const dispatch = useAppDispatch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useGetDoctorChatSessionsQuery(
    { doctorId: doctorId!, patientId: patientId! },
    { skip: !doctorId || !patientId }
  );

  const [triggerHistory] = useLazyGetDoctorChatHistoryQuery();
  const [deleteDoctorChat] = useDeleteDoctorChatMutation();
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const loadHistory = useCallback(
    async (cid: string) => {
      if (!doctorId || !patientId) return;
      setHistoryLoading(true);
      setError(null);
      try {
        const data = await triggerHistory({ doctorId, chatId: cid }).unwrap();
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
    [doctorId, patientId, triggerHistory]
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

  const deleteChat = useCallback(
    async (sessionChatId: string): Promise<boolean> => {
      if (!doctorId || !patientId || !sessionChatId.trim()) return false;
      setError(null);
      setDeletingChatId(sessionChatId);
      try {
        await deleteDoctorChat({ doctorId, patientId, chatId: sessionChatId }).unwrap();
        if (chatId === sessionChatId) {
          newChat();
        }
        return true;
      } catch (e: unknown) {
        let msg = "Failed to delete chat";
        if (e && typeof e === "object" && "data" in e) {
          const data = (e as { data?: { detail?: unknown } }).data;
          const d = data?.detail;
          if (typeof d === "string") msg = d;
          else if (Array.isArray(d)) msg = d.map((x) => String(x)).join(", ");
        } else if (e instanceof Error) {
          msg = e.message;
        }
        setError(msg);
        return false;
      } finally {
        setDeletingChatId(null);
      }
    },
    [doctorId, patientId, chatId, deleteDoctorChat, newChat]
  );

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
          onChatTitle: () => {
            dispatch(
              baseApi.util.invalidateTags([
                {
                  type: "ChatSessions",
                  id: `${doctorId}-${patientId}`,
                },
              ])
            );
          },
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
            dispatch(
              baseApi.util.invalidateTags([
                { type: "Chat", id: newChatId },
                {
                  type: "ChatSessions",
                  id: `${doctorId}-${patientId}`,
                },
              ])
            );
            updateLast((msg) => ({
              ...msg,
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
    [doctorId, patientId, chatId, isLoading, dispatch]
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
    deletingChatId,
    error,
    sendMessage,
    newChat,
    deleteChat,
    selectSession,
    refreshSessions: refetchSessions,
  };
}
