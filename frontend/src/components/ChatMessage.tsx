import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Bot, FileText, User, UserRound } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConnectedPatientDocumentBlob } from "../api/doctors";
import { fetchDocumentBlob } from "../api/documents";
import { paths } from "../router/paths";
import type { CitationSource, Message } from "../types/chat";
import {
  chatMessageAvatarSx,
  chatMessageBubbleSx,
  chatMessageTimestampSx,
} from "../theme/chatMessages";
import { Markdown } from "../ui/Markdown";
import { DifferentialDiagnosisMessage } from "./chat/DifferentialDiagnosisMessage";
import { FitnessPlanMessage } from "./chat/FitnessPlanMessage";
import { MealPlanMessage } from "./chat/MealPlanMessage";

export type ChatMessageContext = {
  doctorId?: string;
  patientId: string;
  chatId?: string;
};

interface ChatMessageProps {
  message: Message;
  /** When set (doctor chat), meal-plan rows can download PDF / share with patient. */
  messageContext?: ChatMessageContext;
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

function ChatMessageInner({ message, messageContext }: ChatMessageProps) {
  const isUser = message.role === "user";
  const role = isUser ? "user" : "assistant";
  const navigate = useNavigate();
  const [citationError, setCitationError] = useState<string | null>(null);

  const content = useMemo(() => message.content, [message.content]);
  const citations = message.citations ?? [];

  const openCitation = useCallback(
    async (source: CitationSource) => {
      if (!messageContext) return;
      setCitationError(null);
      if (source.source_type === "profile_field") {
        const field = source.profile_field || "demographics";
        const base = messageContext.doctorId
          ? paths.doctor.patientDetail(messageContext.patientId)
          : field === "medications"
            ? paths.patient.root
            : paths.patient.profile;
        navigate(`${base}#profile-${field}`);
        return;
      }

      if (!source.document_id) return;
      const pendingWindow = window.open("about:blank", "_blank");
      if (pendingWindow) pendingWindow.opener = null;
      try {
        const blob = messageContext.doctorId
          ? await fetchConnectedPatientDocumentBlob(
              messageContext.doctorId,
              messageContext.patientId,
              source.document_id
            )
          : await fetchDocumentBlob(messageContext.patientId, source.document_id);
        const blobUrl = URL.createObjectURL(blob);
        if (pendingWindow) pendingWindow.location.replace(blobUrl);
        else window.open(blobUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      } catch (error) {
        pendingWindow?.close();
        setCitationError(
          error instanceof Error ? error.message : "Could not open this source."
        );
      }
    },
    [messageContext, navigate]
  );

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
          ...((message.message_type === "meal_plan" ||
            message.message_type === "fitness_plan" ||
            message.message_type === "differential_diagnosis") && {
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
            doctorId={messageContext?.doctorId}
            patientId={messageContext?.patientId}
            chatId={messageContext?.chatId}
          />
        ) : message.message_type === "fitness_plan" && message.fitness_plan ? (
          <FitnessPlanMessage
            payload={message.fitness_plan}
            isStreaming={message.isStreaming}
            messageId={message.messageId}
            doctorId={messageContext?.doctorId}
            patientId={messageContext?.patientId}
            chatId={messageContext?.chatId}
          />
        ) : message.message_type === "differential_diagnosis" &&
          message.differential_diagnosis ? (
          <Box sx={{ width: "100%" }}>
            <DifferentialDiagnosisMessage
              payload={message.differential_diagnosis}
              isStreaming={message.isStreaming}
            />
            {message.content ? (
              <Box
                sx={{
                  typography: "body2",
                  lineHeight: 1.6,
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                  "& > :first-child": { mt: 0 },
                  "& > :last-child": { mb: 0 },
                }}
              >
                <Markdown citations={citations} onCitationClick={openCitation}>
                  {message.content}
                </Markdown>
              </Box>
            ) : null}
          </Box>
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
            <Markdown citations={citations} onCitationClick={openCitation}>
              {content}
            </Markdown>
            {message.isStreaming ? <StreamingCursor /> : null}
          </Box>
        )}

        {!isUser && citations.length > 0 ? (
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ mt: 1.25, pt: 1, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", mr: 0.25 }}>
              Sources
            </Typography>
            {citations.map((source) => (
              <Chip
                key={source.source_id}
                size="small"
                variant="outlined"
                icon={source.source_type === "document" ? <FileText size={13} /> : <UserRound size={13} />}
                label={source.title}
                title={[source.title, source.detail].filter(Boolean).join(" — ")}
                onClick={() => void openCitation(source)}
                sx={{ height: 24, fontSize: "0.7rem" }}
              />
            ))}
          </Stack>
        ) : null}
        {citationError ? (
          <Typography variant="caption" color="error.main" role="alert" sx={{ display: "block", mt: 0.75 }}>
            {citationError}
          </Typography>
        ) : null}

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
  const pc = prev.messageContext;
  const nc = next.messageContext;
  return (
    p.content === n.content &&
    p.isStreaming === n.isStreaming &&
    p.isThinking === n.isThinking &&
    p.thinkingStatus === n.thinkingStatus &&
    p.message_type === n.message_type &&
    p.meal_plan === n.meal_plan &&
    p.fitness_plan === n.fitness_plan &&
    p.differential_diagnosis === n.differential_diagnosis &&
    p.citations === n.citations &&
    p.messageId === n.messageId &&
    pc?.doctorId === nc?.doctorId &&
    pc?.patientId === nc?.patientId &&
    pc?.chatId === nc?.chatId
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
