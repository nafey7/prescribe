import { MessageCircle, Pill } from "lucide-react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { RecentActivityItem } from "../../../types/doctor";
import { formatRelativeShort } from "./formatRelative";

export default function ActivityItem({ item }: { item: RecentActivityItem }) {
  const Icon = item.type === "chat" ? MessageCircle : Pill;
  const label = item.type === "chat" ? "Chat" : "Prescription";
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        gap: 1.5,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
          color: "text.secondary",
        }}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label} with {item.patient_name}
          <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
            {" "}
            · {formatRelativeShort(item.timestamp)}
          </Typography>
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {item.summary}
        </Typography>
      </Box>
    </Box>
  );
}
