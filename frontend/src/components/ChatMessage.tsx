import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Bot, User } from "lucide-react";
import { memo, useMemo } from "react";
import type { Message } from "../types/chat";
import {
  chatMessageAvatarSx,
  chatMessageBubbleSx,
  chatMessageTimestampSx,
} from "../theme/chatMessages";
import { Markdown } from "../ui/Markdown";
import { FitnessPlanMessage } from "./chat/FitnessPlanMessage";
import { MealPlanMessage } from "./chat/MealPlanMessage";

export type MealPlanDoctorContext = {
  doctorId: string;
  patientId: string;
  chatId?: string;
};

interface ChatMessageProps {
  message: Message;
  /** When set (doctor chat), meal-plan rows can download PDF / share with patient. */
  mealPlanContext?: MealPlanDoctorContext;
}

function StreamingCursor() {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-block",
        width: 2,
        height: "1em",
        ml: 0.25,
        verticalAlign: "text-bottom",
        bgcolor: "currentColor",
        "@keyframes chatBlinkCursor": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        animation: "chatBlinkCursor 0.8s steps(1) infinite",
      }}
    />
  );
}

function ChatMessageInner({ message, mealPlanContext }: ChatMessageProps) {
  const isUser = message.role === "user";
  const role = isUser ? "user" : "assistant";

  const content = useMemo(() => message.content, [message.content]);

  return (
    <Stack
      direction={isUser ? "row-reverse" : "row"}
      spacing={1.5}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        "@keyframes chatFadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        animation: "chatFadeIn 0.3s ease-out",
      }}
    >
      <Box sx={(theme) => chatMessageAvatarSx(theme, role)}>
        {isUser ? <User size={16} strokeWidth={2} /> : <Bot size={16} strokeWidth={2} />}
      </Box>

      <Box
        sx={(theme) => ({
          ...chatMessageBubbleSx(theme, role),
          ...((message.message_type === "meal_plan" || message.message_type === "fitness_plan") && {
            width: "100%",
            maxWidth: "min(92%, 680px)",
          }),
        })}
      >
        {isUser ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {message.content}
          </Typography>
        ) : message.message_type === "meal_plan" && message.meal_plan ? (
          <MealPlanMessage
            payload={message.meal_plan}
            isStreaming={message.isStreaming}
            messageId={message.messageId}
            doctorId={mealPlanContext?.doctorId}
            patientId={mealPlanContext?.patientId}
            chatId={mealPlanContext?.chatId}
          />
        ) : message.message_type === "fitness_plan" && message.fitness_plan ? (
          <FitnessPlanMessage
            payload={message.fitness_plan}
            isStreaming={message.isStreaming}
            messageId={message.messageId}
            doctorId={mealPlanContext?.doctorId}
            patientId={mealPlanContext?.patientId}
            chatId={mealPlanContext?.chatId}
          />
        ) : (
          <Box
            sx={{
              typography: "body2",
              lineHeight: 1.6,
              "& > :first-child": { mt: 0 },
              "& > :last-child": { mb: 0 },
              ...(message.isStreaming && {
                "& > *:nth-last-child(2)": { display: "inline", mb: 0 },
              }),
            }}
          >
            <Markdown>{content}</Markdown>
            {message.isStreaming ? <StreamingCursor /> : null}
          </Box>
        )}

        <Typography variant="caption" sx={(theme) => chatMessageTimestampSx(theme, role)}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>
    </Stack>
  );
}

const ChatMessage = memo(ChatMessageInner, (prev, next) => {
  const p = prev.message;
  const n = next.message;
  const pc = prev.mealPlanContext;
  const nc = next.mealPlanContext;
  return (
    p.content === n.content &&
    p.isStreaming === n.isStreaming &&
    p.isThinking === n.isThinking &&
    p.thinkingStatus === n.thinkingStatus &&
    p.message_type === n.message_type &&
    p.meal_plan === n.meal_plan &&
    p.fitness_plan === n.fitness_plan &&
    p.messageId === n.messageId &&
    pc?.doctorId === nc?.doctorId &&
    pc?.patientId === nc?.patientId &&
    pc?.chatId === nc?.chatId
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
