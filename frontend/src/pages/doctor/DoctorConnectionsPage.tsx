import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import {
  useAcceptConnectionMutation,
  useGetConnectionsQuery,
  useRejectConnectionMutation,
} from "../../api/connectionsApi";
import { useIdentity } from "../../contexts/IdentityContext";
import { rtkErrorMessage } from "../../lib/rtkErrorMessage";
import type { ConnectionResponse } from "../../types/doctor";
import { formatRelativeShort } from "../../components/doctor/dashboard/formatRelative";

function ConnectionRow({
  row,
  onAccept,
  onReject,
  busyId,
}: {
  row: ConnectionResponse;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  busyId: string | null;
}) {
  const isPending = row.status === "pending";
  const name = row.patient_name ?? row.patient_id;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        py: 2,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0, pb: 0 },
        "&:first-of-type": { pt: 0 },
      }}
    >
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isPending
            ? `Wants to connect · ${formatRelativeShort(row.initiated_at)}`
            : `Connected · ${row.responded_at ? formatRelativeShort(row.responded_at) : "—"}`}
        </Typography>
      </Box>
      {isPending && onAccept && onReject ? (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={busyId === row.connection_id}
            onClick={() => onAccept(row.connection_id)}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            disabled={busyId === row.connection_id}
            onClick={() => onReject(row.connection_id)}
          >
            Reject
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}

function Section({
  title,
  rows,
  emptyText,
  onAccept,
  onReject,
  busyId,
}: {
  title: string;
  rows: ConnectionResponse[];
  emptyText: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  busyId: string | null;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: 2.5, boxShadow: 1 }}>
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 600 }}>
        {title}
        {rows.length > 0 && (
          <Box
            component="span"
            sx={{
              ml: 1,
              px: 0.75,
              py: 0.125,
              borderRadius: 2,
              bgcolor: "action.selected",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {rows.length}
          </Box>
        )}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {emptyText}
        </Typography>
      ) : (
        <Stack
          component="ul"
          spacing={0}
          sx={{ listStyle: "none", m: 0, p: 0, mt: 2 }}
        >
          {rows.map((row) => (
            <Box component="li" key={row.connection_id}>
              <ConnectionRow
                row={row}
                onAccept={onAccept}
                onReject={onReject}
                busyId={busyId}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function DoctorConnectionsPage() {
  const { currentDoctorId } = useIdentity();
  const { data, isLoading, isError, error } = useGetConnectionsQuery(
    { doctorId: currentDoctorId ?? "", limit: 100 },
    { skip: !currentDoctorId }
  );

  const [acceptConnection] = useAcceptConnectionMutation();
  const [rejectConnection] = useRejectConnectionMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAccept(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await acceptConnection(id).unwrap();
    } catch (e) {
      setActionError(rtkErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await rejectConnection(id).unwrap();
    } catch (e) {
      setActionError(rtkErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const pending = (data?.connections ?? []).filter(
    (c) => c.status === "pending"
  );
  const active = (data?.connections ?? []).filter(
    (c) => c.status === "accepted"
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Connections
      </Typography>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {isError && (
        <Typography variant="body2" color="error" role="alert">
          {rtkErrorMessage(error)}
        </Typography>
      )}

      {actionError && (
        <Typography variant="body2" color="error" role="alert">
          {actionError}
        </Typography>
      )}

      {!isLoading && !isError && (
        <>
          <Section
            title="Pending requests"
            rows={pending}
            emptyText="No pending requests. Patients who want to connect will appear here."
            onAccept={(id) => void handleAccept(id)}
            onReject={(id) => void handleReject(id)}
            busyId={busyId}
          />
          <Divider />
          <Section
            title="Active connections"
            rows={active}
            emptyText="No active connections yet."
            busyId={busyId}
          />
        </>
      )}
    </Stack>
  );
}
