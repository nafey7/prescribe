import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { paths } from "../router/paths";

/**
 * When the backend allows dev header identity, children render without JWT.
 * Otherwise requires an authenticated session (or redirects to `/` with returnUrl).
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authRelaxed, isLoading: flagsLoading } = useFeatureFlags();
  const { status } = useAuth();
  const location = useLocation();

  if (flagsLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "40vh",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        <CircularProgress size={22} color="primary" />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  if (authRelaxed) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "40vh",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        <CircularProgress size={22} color="primary" />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        to={`${paths.root}?returnUrl=${encodeURIComponent(
          `${location.pathname}${location.search}`
        )}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
