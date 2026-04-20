import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { paths } from "../../../router/paths";
import type { RecentActivityItem } from "../../../types/doctor";
import ActivityItem from "./ActivityItem";

export default function RecentActivityCard({
  items,
}: {
  items: RecentActivityItem[];
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: 2.5, boxShadow: 1 }}>
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 600 }}>
        Recent activity
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Chats and prescriptions will appear here as you use the platform.
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 1 }}>
          {items.map((item) => (
            <ActivityItem
              key={`${item.type}-${item.timestamp}-${item.patient_id}`}
              item={item}
            />
          ))}
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Link
          component={RouterLink}
          to={paths.doctor.patients}
          variant="body2"
          color="secondary.dark"
          underline="hover"
          sx={{ fontWeight: 500 }}
        >
          View more →
        </Link>
      </Box>
    </Paper>
  );
}
