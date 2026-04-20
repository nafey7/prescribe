import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
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

  const {
    messages,
    chatId,
    sessions,
    sessionsLoading,
    historyLoading,
    isLoading,
    sendMessage,
    newChat,
    selectSession,
  } = useDoctorChat(currentDoctorId, patientId ?? null);

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
        />

        <Box sx={{ display: "flex", minHeight: 0, minWidth: 0, flex: 1, flexDirection: "column" }}>
          <Box component="header" sx={(theme) => chatPanelToolbarSx(theme)}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                }}
              >
                <MessageSquare size={18} />
              </Box>
              <Box>
                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
                  AI Medical Assistant
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Patient: {titleName}
                  {historyLoading ? " · Loading history…" : null}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
            <MessageList
              messages={messages}
              isLoading={isLoading}
              onSuggestionClick={sendMessage}
            />
          </Box>

          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </Box>
      </Box>
    </Box>
  );
}
