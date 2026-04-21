import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type PortalSidebarBrandRowProps = {
  accent: "primary" | "secondary";
  title: string;
  subtitle: string;
  emoji?: string;
  trailing?: ReactNode;
  className?: string;
  brandTextClassName?: string;
};

/**
 * Shared 56px sidebar brand row: logo tile, title stack, optional trailing slot (e.g. theme toggle).
 * Used by patient `Sidebar` and `DoctorSidebar` to keep chrome aligned.
 */
export function PortalSidebarBrandRow({
  accent,
  title,
  subtitle,
  emoji = "🩺",
  trailing,
  className,
  brandTextClassName,
}: PortalSidebarBrandRowProps) {
  const tileBg = accent === "primary" ? "primary.main" : "secondary.dark";
  const tileColor =
    accent === "primary" ? "primary.contrastText" : "secondary.contrastText";

  return (
    <Box
      className={className}
      sx={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        px: 1.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", minWidth: 0, alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 1.5,
            bgcolor: tileBg,
            color: tileColor,
            typography: "subtitle1",
            lineHeight: 1,
          }}
        >
          {emoji}
        </Box>
        <Box className={brandTextClassName} sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap color="text.primary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" noWrap color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Box>
      {trailing ? (
        <Box sx={{ ml: "auto", flexShrink: 0, display: "flex", alignItems: "center" }}>
          {trailing}
        </Box>
      ) : null}
    </Box>
  );
}
