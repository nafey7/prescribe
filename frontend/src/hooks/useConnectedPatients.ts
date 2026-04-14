import { useCallback, useEffect, useState } from "react";
import { getConnectedPatients } from "../api/doctors";
import type { ConnectedPatientListResponse } from "../types/doctor";

export function useConnectedPatients(
  doctorId: string | null,
  options: {
    search: string;
    sort: "recent" | "name" | "last_visit";
    page: number;
    pageSize: number;
  }
) {
  const { search, sort, page, pageSize } = options;
  const [data, setData] = useState<ConnectedPatientListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!doctorId) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      const res = await getConnectedPatients(doctorId, {
        search: search.trim() || undefined,
        sort,
        skip,
        limit: pageSize,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patients");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId, search, sort, page, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
