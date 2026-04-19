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
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  if (authRelaxed) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
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
