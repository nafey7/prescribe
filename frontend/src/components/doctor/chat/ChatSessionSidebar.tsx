import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { chatPanelToolbarSx } from "./chatPanelToolbarSx";
import { formatRelativeShort } from "../dashboard/formatRelative";
import type { ChatSessionSummary } from "../../../types/doctor";

interface ChatSessionSidebarProps {
  sessions: ChatSessionSummary[];
  selectedChatId: string | undefined;
  onSelect: (chatId: string) => void;
  onNew: () => void;
  isLoading: boolean;
  onDeleteChat: (chatId: string) => Promise<boolean>;
  deletingChatId: string | null;
}

export default function ChatSessionSidebar({
  sessions,
  selectedChatId,
  onSelect,
  onNew,
  isLoading,
  onDeleteChat,
  deletingChatId,
}: ChatSessionSidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmBusy = confirmDeleteId !== null && deletingChatId === confirmDeleteId;

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
        borderBottomColor: "divider",
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
          spacing={2}
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
          size="small"
          startIcon={<Plus size={14} aria-hidden />}
          sx={{ textTransform: "none", flexShrink: 0, py: 0.25, px: 1, minHeight: 0 }}
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
            const rowDeleting = deletingChatId === s.chat_id;
            return (
              <ListItemButton
                key={s.chat_id}
                onClick={() => onSelect(s.chat_id)}
                sx={(theme) => ({
                  borderRadius: 2,
                  py: 1,
                  px: 1,
                  gap: 0.5,
                  alignItems: "flex-start",
                  display: "flex",
                  minWidth: 0,
                  "@media (hover: hover) and (pointer: fine)": {
                    "&:hover .session-delete-btn": { opacity: 1 },
                  },
                  "@media (hover: none), (pointer: coarse)": {
                    ".session-delete-btn": { opacity: 0.65 },
                  },
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
                <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
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
                <IconButton
                  type="button"
                  className="session-delete-btn"
                  size="small"
                  aria-label={`Delete chat ${primary}`}
                  disabled={rowDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDeleteId(s.chat_id);
                  }}
                  sx={(theme) => ({
                    alignSelf: "flex-start",
                    mt: 0.25,
                    flexShrink: 0,
                    opacity: rowDeleting ? 1 : 0,
                    transition: theme.transitions.create("opacity", { duration: 120 }),
                    color: "text.secondary",
                    "&:focus-visible": { opacity: 1 },
                  })}
                >
                  {rowDeleting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </IconButton>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => (!confirmBusy ? setConfirmDeleteId(null) : undefined)}
        aria-labelledby="session-delete-chat-title"
      >
        <DialogTitle id="session-delete-chat-title">Delete this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the conversation from your history for this patient. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} disabled={confirmBusy}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={confirmBusy}
            onClick={async () => {
              if (!confirmDeleteId) return;
              const ok = await onDeleteChat(confirmDeleteId);
              if (ok) setConfirmDeleteId(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
