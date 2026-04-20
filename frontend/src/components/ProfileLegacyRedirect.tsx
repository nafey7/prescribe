import { useLayoutEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { usePatientContext } from "../contexts/PatientContext";
import { paths } from "../router/paths";

/**
 * Old bookmarks used `/profile/:userId`. Sync selection from URL then land on the patient profile route.
 */
export default function ProfileLegacyRedirect() {
  const { userId } = useParams<{ userId: string }>();
  const { patients, isLoading, setCurrentPatientId } = usePatientContext();
  const [synced, setSynced] = useState(false);

  useLayoutEffect(() => {
    if (!userId || isLoading) return;
    const match = patients.find(
      (p) => p.user_id === userId || p.id === userId
    );
    if (match) setCurrentPatientId(match.id);
    setSynced(true);
  }, [userId, patients, isLoading, setCurrentPatientId]);

  if (isLoading || !synced) {
    return (
      <Box
        sx={{
          minHeight: "40vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  return <Navigate to={paths.patient.profile} replace />;
}
