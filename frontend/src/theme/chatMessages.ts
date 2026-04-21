import type { Theme } from "@mui/material";
import { alpha } from "@mui/material";

export type ChatMessageBubbleRole = "user" | "assistant";

const AVATAR_PX = 32;
const BUBBLE_MAX_WIDTH = "min(75%, 560px)";

/**
 * MUI `sx` border-radius: a **number is a multiplier** of `theme.shape.borderRadius` (default 8px).
 * Never pass `theme.shape.borderRadius` raw (e.g. `8`) or corners become ~64px → pill / stadium shapes.
 */
const BUBBLE_RADIUS_UNITS = 1.5;

/**
 * Chat bubble + avatar styling (doctor portal: secondary teal accent for user, neutral for assistant).
 * Rounded rectangles (ChatGPT/WhatsApp-like), not pills — tight width to content.
 */
export function chatMessageAvatarSx(theme: Theme, role: ChatMessageBubbleRole) {
  const base = {
    flexShrink: 0,
    width: AVATAR_PX,
    height: AVATAR_PX,
    borderRadius: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (role === "user") {
    return {
      ...base,
      bgcolor: alpha(theme.palette.secondary.main, 0.2),
      color: "secondary.dark",
    };
  }

  return {
    ...base,
    bgcolor: alpha(theme.palette.secondary.main, 0.1),
    color: "secondary.main",
  };
}

export function chatMessageBubbleSx(theme: Theme, role: ChatMessageBubbleRole) {
  if (role === "user") {
    return {
      width: "fit-content",
      maxWidth: BUBBLE_MAX_WIDTH,
      minWidth: 0,
      px: 1.75,
      py: 1,
      borderRadius: BUBBLE_RADIUS_UNITS,
      bgcolor: alpha(theme.palette.secondary.main, 0.18),
      color: "text.primary",
      border: `1px solid ${alpha(theme.palette.secondary.main, 0.38)}`,
      boxShadow: "none",
    };
  }

  return {
    width: "fit-content",
    maxWidth: BUBBLE_MAX_WIDTH,
    minWidth: 0,
    px: 1.75,
    py: 1,
    borderRadius: BUBBLE_RADIUS_UNITS,
    bgcolor: theme.palette.surface.subtle,
    color: "text.primary",
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
  };
}

export function chatMessageTimestampSx(theme: Theme, role: ChatMessageBubbleRole) {
  if (role === "user") {
    return {
      display: "block",
      mt: 0.75,
      color: alpha(theme.palette.secondary.dark, 0.55),
    };
  }

  return {
    display: "block",
    mt: 0.75,
    color: "text.disabled",
  };
}

/** Assistant “thinking” / typing row — matches receiver bubble language. */
export function chatAssistantStatusBubbleSx(theme: Theme) {
  return {
    width: "fit-content",
    maxWidth: BUBBLE_MAX_WIDTH,
    bgcolor: theme.palette.surface.subtle,
    border: 1,
    borderColor: "divider",
    borderRadius: BUBBLE_RADIUS_UNITS,
    px: 1.75,
    py: 1,
    boxShadow: "none",
  };
}

export function chatAssistantStatusAvatarSx(theme: Theme) {
  return chatMessageAvatarSx(theme, "assistant");
}
