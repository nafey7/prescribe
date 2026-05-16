import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { Stethoscope } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import {
  chatAssistantStatusAvatarSx,
  chatAssistantStatusBubbleSx,
} from "../theme/chatMessages";
import type { Message, ThinkingPhase } from "../types/chat";
import ChatMessage, { type MealPlanDoctorContext } from "./ChatMessage";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  /** When set, empty-state suggestion chips send this text (e.g. `sendMessage`). */
  onSuggestionClick?: (text: string) => void;
  /** Doctor chat: enables meal-plan PDF + share actions. */
  mealPlanContext?: MealPlanDoctorContext;
}

function ThinkingIndicator({
  status,
  phase = "thinking",
}: {
  status?: string;
  phase?: ThinkingPhase;
}) {
  const isWebSearch = phase === "web_search";
  const isDifferential = phase === "differential";
  const primaryLabel = isWebSearch
    ? "Searching the web..."
    : isDifferential
      ? "Building differential..."
      : "Thinking...";
  const showSubtitle = Boolean(status && status !== primaryLabel);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        "@keyframes chatThinkingEnter": {
          from: { opacity: 0, transform: "translateY(4px) scale(0.97)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        animation: "chatThinkingEnter 0.25s ease-out",
      }}
    >
      <Box sx={(theme) => chatAssistantStatusAvatarSx(theme)}>
        <Stethoscope size={16} strokeWidth={2} />
      </Box>
      <Box sx={(theme) => chatAssistantStatusBubbleSx(theme)}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "secondary.main",
                "@keyframes chatThinkingPulse": {
                  "0%, 100%": { opacity: 0.4, transform: "scale(0.85)" },
                  "50%": { opacity: 1, transform: "scale(1.1)" },
                },
                animation: "chatThinkingPulse 1.2s ease-in-out infinite",
              }}
            />
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
              {primaryLabel}
            </Typography>
          </Stack>
          {showSubtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 2.5 }}>
              {status}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick?: (text: string) => void }) {
  return (
    <Stack
      sx={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 4,
      }}
    >
      <Box
        sx={(theme) => ({
          width: 64,
          height: 64,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
          bgcolor: alpha(theme.palette.success.main, 0.08),
          color: "success.main",
        })}
      >
        <Stethoscope size={32} />
      </Box>
      <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600, mb: 1 }}>
        Medical AI Assistant
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.6 }}>
        Ask a question about your patient&apos;s health, symptoms, medications, or medical history. The
        AI will reference their medical records to provide informed responses.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "center", mt: 3 }}>
        {[
          "What medications is this patient currently on?",
          "Are there any drug interactions to worry about?",
          "Summarize the patient's medical history",
        ].map((suggestion) => (
          <Chip
            key={suggestion}
            label={suggestion}
            size="small"
            variant="outlined"
            onClick={onSuggestionClick ? () => onSuggestionClick(suggestion) : undefined}
            sx={{
              borderColor: "divider",
              color: "text.secondary",
              maxWidth: "100%",
              ...(onSuggestionClick
                ? { cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }
                : {}),
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
}

const SCROLL_THROTTLE_MS = 100;

export default function MessageList({
  messages,
  isLoading,
  onSuggestionClick,
  mealPlanContext,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
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
    return (
      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
        <EmptyState onSuggestionClick={onSuggestionClick} />
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {messages.map((msg, i) =>
        msg.isThinking ? null : (
          <ChatMessage
            key={`${msg.timestamp}-${i}-${msg.messageId ?? ""}`}
            message={msg}
            mealPlanContext={mealPlanContext}
          />
        )
      )}
      {showThinking ? (
        <ThinkingIndicator
          status={lastMessage.thinkingStatus}
          phase={lastMessage.thinkingPhase}
        />
      ) : null}
      <div ref={bottomRef} />
    </Stack>
  );
}
