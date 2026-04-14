import { useCallback, useEffect, useState } from "react";
import { getDoctorDashboard } from "../api/doctors";
import { useIdentity } from "../contexts/IdentityContext";
import type { DoctorDashboardResponse } from "../types/doctor";

export function useDoctorDashboard() {
  const { currentDoctorId } = useIdentity();
  const [data, setData] = useState<DoctorDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!currentDoctorId) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getDoctorDashboard(currentDoctorId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDoctorId, version]);

  return { data, isLoading, error, refresh };
}
