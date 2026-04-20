import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { CONTENT_MAX_WIDTH_PX, CONTENT_PADDING_X } from "./layoutContent";

/**
 * Centers route content and applies shared horizontal padding. Used by
 * `PatientLayout` / `DoctorLayout` for every route except AI chat (full-bleed).
 */
export default function MainContent({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: CONTENT_MAX_WIDTH_PX,
        mx: "auto",
        px: CONTENT_PADDING_X,
        boxSizing: "border-box",
      }}
    >
      {children}
    </Box>
  );
}
