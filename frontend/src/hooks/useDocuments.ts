import { useCallback, useEffect, useState } from "react";
import { listDocuments } from "../api/documents";
import type { DocumentListResponse } from "../types/document";

export function useDocuments(
  patientId: string | null,
  options: { category?: string; page?: number; pageSize?: number } = {}
) {
  const { category = "all", page = 1, pageSize = 20 } = options;
  const [data, setData] = useState<DocumentListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await listDocuments(patientId, { category, page, pageSize });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, category, page, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
