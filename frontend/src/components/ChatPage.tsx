import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MessageSquare, RotateCcw, UserCircle } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { usePatientContext } from "../contexts/PatientContext";
import { useChat } from "../hooks/useChat";
import { paths } from "../router/paths";
import ChatInput from "./ChatInput";
import DevIdentityBanner from "./DevIdentityBanner";
import MessageList from "./MessageList";
import PatientSelector from "./PatientSelector";

export default function ChatPage() {
  const { currentPatientId, setCurrentPatientId } = usePatientContext();
  const { messages, isLoading, sendMessage, clearChat, draftMessage, setDraftMessage } =
    useChat(currentPatientId);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      setDraftMessage(prefill);
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileHref = paths.patient.profile;

  const handlePatientChange = useCallback(
    (id: string) => setCurrentPatientId(id),
    [setCurrentPatientId]
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: 0,
        width: "100%",
        flex: 1,
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {import.meta.env.DEV ? (
        <DevIdentityBanner />
      ) : (
        <Box
          sx={{
            flexShrink: 0,
            minHeight: 56,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 2,
            py: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: "flex-end", width: "100%", minHeight: 56, alignItems: "center" }}
          >
            <PatientSelector
              selectedId={currentPatientId}
              onChange={handlePatientChange}
            />
          </Stack>
        </Box>
      )}

      <Box
        component="header"
        sx={{
          flexShrink: 0,
          minHeight: 56,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          px: 2,
          py: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            minHeight: 56,
            py: 1,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "success.main",
                color: "success.contrastText",
              }}
            >
              <MessageSquare size={18} />
            </Box>
            <Box>
              <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
                Medical AI Chat
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Patient record-aware assistant
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <Button
              component={RouterLink}
              to={paths.patient.root}
              variant="outlined"
              size="small"
              sx={{ textTransform: "none", fontWeight: 500 }}
            >
              Patient portal
            </Button>
            <Button
              component={RouterLink}
              to={profileHref}
              variant="outlined"
              size="small"
              startIcon={<UserCircle size={16} />}
              sx={{ textTransform: "none", fontWeight: 500 }}
            >
              Profile
            </Button>
            <IconButton
              type="button"
              onClick={clearChat}
              title="New conversation"
              aria-label="New conversation"
              size="small"
              sx={{
                color: "text.disabled",
                "&:hover": { bgcolor: "action.hover", color: "text.secondary" },
              }}
            >
              <RotateCcw size={16} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box
        component="main"
        sx={{ display: "flex", minHeight: 0, width: "100%", flex: 1, flexDirection: "column" }}
      >
        <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflowY: "auto" }}>
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onSuggestionClick={sendMessage}
          />
        </Box>
      </Box>

      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        value={draftMessage}
        onChange={setDraftMessage}
      />
    </Box>
  );
}
