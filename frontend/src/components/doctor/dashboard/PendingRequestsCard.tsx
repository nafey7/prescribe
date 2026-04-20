import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  useAcceptConnectionMutation,
  useRejectConnectionMutation,
} from "../../../api/connectionsApi";
import { paths } from "../../../router/paths";
import type { PendingRequestSummary } from "../../../types/doctor";
import { rtkErrorMessage } from "../../../lib/rtkErrorMessage";
import { formatRelativeShort } from "./formatRelative";

export default function PendingRequestsCard({
  items,
  onAfterAction,
}: {
  items: PendingRequestSummary[];
  /** Optional; cache invalidation usually refreshes the dashboard. */
  onAfterAction?: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [acceptConnection] = useAcceptConnectionMutation();
  const [rejectConnection] = useRejectConnectionMutation();

  async function handleAccept(id: string) {
    setLocalError(null);
    setBusyId(id);
    try {
      await acceptConnection(id).unwrap();
      onAfterAction?.();
    } catch (e) {
      setLocalError(rtkErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setLocalError(null);
    setBusyId(id);
    try {
      await rejectConnection(id).unwrap();
      onAfterAction?.();
    } catch (e) {
      setLocalError(rtkErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: 2.5, boxShadow: 1 }}>
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 600 }}>
        Pending connection requests
      </Typography>
      {localError ? (
        <Typography variant="body2" color="error" role="alert" sx={{ mt: 1 }}>
          {localError}
        </Typography>
      ) : null}
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No pending requests. Patients who want to connect will appear here.
        </Typography>
      ) : (
        <Stack
          component="ul"
          spacing={0}
          sx={{ listStyle: "none", m: 0, p: 0, mt: 2 }}
        >
          {items.map((row) => (
            <Box
              component="li"
              key={row.connection_id}
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { sm: "center" },
                justifyContent: "space-between",
                gap: 1.5,
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
                "&:last-of-type": {
                  borderBottom: 0,
                  pb: 0,
                },
                "&:first-of-type": {
                  pt: 0,
                },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {row.patient_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Wants to connect
                  {row.initiated_at
                    ? ` · ${formatRelativeShort(row.initiated_at)}`
                    : ""}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button
                  type="button"
                  size="small"
                  variant="contained"
                  color="secondary"
                  disabled={busyId === row.connection_id}
                  onClick={() => void handleAccept(row.connection_id)}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={busyId === row.connection_id}
                  onClick={() => void handleReject(row.connection_id)}
                >
                  Reject
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      <Box sx={{ mt: 2 }}>
        <Link
          component={RouterLink}
          to={paths.doctor.connections}
          variant="body2"
          color="secondary.dark"
          underline="hover"
          sx={{ fontWeight: 500 }}
        >
          View all requests →
        </Link>
      </Box>
    </Paper>
  );
}
