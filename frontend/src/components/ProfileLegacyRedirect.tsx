import { useLayoutEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { usePatientContext } from "../contexts/PatientContext";

/**
 * Old bookmarks used `/profile/:userId`. Sync selection from URL then land on `/profile`.
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
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return <Navigate to="/profile" replace />;
}
