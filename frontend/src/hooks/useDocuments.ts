import { useListDocumentsQuery } from "../api/documentsApi";
import { rtkErrorMessage } from "../lib/rtkErrorMessage";

export function useDocuments(
  patientId: string | null,
  options: { category?: string; page?: number; pageSize?: number } = {}
) {
  const { category = "all", page = 1, pageSize = 20 } = options;
  const q = useListDocumentsQuery(
    { patientId: patientId!, category, page, pageSize },
    { skip: !patientId }
  );

  return {
    data: q.data ?? null,
    isLoading: q.isLoading,
    error: q.isError ? rtkErrorMessage(q.error) : null,
    refresh: q.refetch,
  };
}
