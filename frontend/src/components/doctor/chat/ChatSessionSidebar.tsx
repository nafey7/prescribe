import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MessageSquare, Plus } from "lucide-react";
import { chatPanelToolbarSx } from "./chatPanelToolbarSx";
import { formatRelativeShort } from "../dashboard/formatRelative";
import type { ChatSessionSummary } from "../../../types/doctor";

interface ChatSessionSidebarProps {
  sessions: ChatSessionSummary[];
  selectedChatId: string | undefined;
  onSelect: (chatId: string) => void;
  onNew: () => void;
  isLoading: boolean;
}

export default function ChatSessionSidebar({
  sessions,
  selectedChatId,
  onSelect,
  onNew,
  isLoading,
}: ChatSessionSidebarProps) {
  return (
    <Box
      component="aside"
      sx={{
        display: "flex",
        width: { xs: "100%", md: 280 },
        minWidth: 0,
        flexShrink: 0,
        flexDirection: "column",
        borderBottom: { xs: 1, md: 0 },
        borderRight: { md: 1 },
        borderColor: "divider",
        bgcolor: "grey.50",
        alignSelf: { md: "stretch" },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={(theme) => ({
          ...chatPanelToolbarSx(theme),
          justifyContent: "space-between",
        })}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", typography: "body2", fontWeight: 500, color: "text.primary" }}
        >
          <Box sx={{ color: "secondary.main", lineHeight: 0, display: "flex" }} aria-hidden>
            <MessageSquare size={16} />
          </Box>
          History
        </Stack>
        <Button
          type="button"
          onClick={onNew}
          variant="contained"
          color="secondary"
          size="medium"
          startIcon={<Plus size={16} aria-hidden />}
          sx={{ textTransform: "none", flexShrink: 0 }}
        >
          New
        </Button>
      </Stack>
      <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", p: 1 }}>
        {isLoading ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1, py: 1.5 }}>
            Loading sessions…
          </Typography>
        ) : null}
        {!isLoading && sessions.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1, py: 1.5 }}>
            No chats yet. Send a message to start.
          </Typography>
        ) : null}
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {sessions.map((s) => {
            const active = selectedChatId === s.chat_id;
            const title = (s.title ?? "").trim();
            const when = formatRelativeShort(s.updated_at);
            const primary = title || when || "Session";
            const secondary = title ? when : `${s.chat_id.slice(0, 8)}…`;
            return (
              <ListItem key={s.chat_id} disablePadding>
                <ListItemButton
                  onClick={() => onSelect(s.chat_id)}
                  sx={(theme) => ({
                    borderRadius: 2,
                    py: 1,
                    alignItems: "flex-start",
                    ...(active
                      ? {
                          bgcolor: alpha(theme.palette.secondary.main, 0.12),
                          fontWeight: 600,
                          color: "secondary.dark",
                          "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.2) },
                        }
                      : {
                          color: "text.primary",
                          "&:hover": { bgcolor: "action.hover" },
                        }),
                  })}
                >
                  <Box sx={{ width: "100%", minWidth: 0, textAlign: "left" }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: "inherit" }}>
                      {primary}
                    </Typography>
                    {secondary ? (
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ display: "block", fontFamily: "monospace", fontSize: "0.625rem", color: "text.disabled" }}
                      >
                        {secondary}
                      </Typography>
                    ) : null}
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}
