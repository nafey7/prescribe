import { useGetConnectedPatientsQuery } from "../api/doctorsApi";
import { rtkErrorMessage } from "../lib/rtkErrorMessage";
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
  const skip = (page - 1) * pageSize;

  const { data, isLoading, error, refetch } = useGetConnectedPatientsQuery(
    {
      doctorId: doctorId ?? "",
      search: search.trim() || undefined,
      sort,
      skip,
      limit: pageSize,
    },
    { skip: !doctorId }
  );

  return {
    data: data ?? null,
    isLoading: !!doctorId && isLoading,
    error: error ? rtkErrorMessage(error) : null,
    refresh: refetch,
  };
}
