import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { UserCircle } from "lucide-react";
import { useEffect, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { getConnectedPatientProfile } from "../../api/doctors";
import ChatInput from "../../components/ChatInput";
import ChatSessionSidebar from "../../components/doctor/chat/ChatSessionSidebar";
import { chatPanelToolbarSx } from "../../components/doctor/chat/chatPanelToolbarSx";
import MessageList from "../../components/MessageList";
import { useIdentity } from "../../contexts/IdentityContext";
import { useDoctorChat } from "../../hooks/useDoctorChat";

export default function DoctorChatPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentDoctorId } = useIdentity();
  const [patientLabel, setPatientLabel] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");

  const {
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
    selectSession,
    deleteChat,
  } = useDoctorChat(currentDoctorId, patientId ?? null);

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text);
      setDraftMessage("");
    },
    [sendMessage]
  );

  useEffect(() => {
    if (!currentDoctorId || !patientId) {
      setPatientLabel(null);
      return;
    }
    let cancelled = false;
    getConnectedPatientProfile(currentDoctorId, patientId)
      .then((p) => {
        if (cancelled) return;
        const n = `${p.first_name} ${p.last_name}`.trim();
        setPatientLabel(n || null);
      })
      .catch(() => {
        if (!cancelled) setPatientLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDoctorId, patientId]);

  if (!currentDoctorId) {
    return (
      <Typography variant="body2" sx={{ color: "warning.dark" }}>
        Select a doctor in the dev identity bar to use AI chat.
      </Typography>
    );
  }

  if (!patientId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Missing patient.
      </Typography>
    );
  }

  const titleName = patientLabel || patientId;

  return (
    <Box sx={{ display: "flex", minHeight: 0, width: "100%", minWidth: 0, flex: 1, flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          minHeight: 0,
          flex: 1,
          flexDirection: { xs: "column", md: "row" },
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          borderRadius: { xs: 0, sm: 1 },
        }}
      >
        <ChatSessionSidebar
          sessions={sessions}
          selectedChatId={chatId}
          onSelect={selectSession}
          onNew={newChat}
          isLoading={sessionsLoading}
          onDeleteChat={deleteChat}
          deletingChatId={deletingChatId}
        />

        <Box
          sx={(theme) => ({
            display: "flex",
            minHeight: 0,
            minWidth: 0,
            flex: 1,
            flexDirection: "column",
            borderLeft: { md: `1px solid ${theme.palette.divider}` },
          })}
        >
          <Box component="header" sx={(theme) => chatPanelToolbarSx(theme)}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", minWidth: 0 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  flexShrink: 0,
                }}
              >
                <UserCircle size={16} strokeWidth={1.75} aria-hidden />
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", minWidth: 0 }}>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }} noWrap>
                  {titleName}
                </Typography>
                {historyLoading ? (
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    Loading history…
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Box>

          {error ? (
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              {error}
            </Alert>
          ) : null}

          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
            <MessageList
              messages={messages}
              isLoading={isLoading}
              onSuggestionClick={sendMessage}
              mealPlanContext={{
                doctorId: currentDoctorId,
                patientId: patientId,
                chatId,
              }}
            />
          </Box>

          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            value={draftMessage}
            onChange={setDraftMessage}
          />
        </Box>
      </Box>
    </Box>
  );
}
