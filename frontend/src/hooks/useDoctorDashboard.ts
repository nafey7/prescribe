import { useGetDoctorDashboardQuery } from "../api/doctorsApi";
import { useIdentity } from "../contexts/IdentityContext";
import { rtkErrorMessage } from "../lib/rtkErrorMessage";

export function useDoctorDashboard() {
  const { currentDoctorId } = useIdentity();
  const { data, isLoading, error, refetch } = useGetDoctorDashboardQuery(
    currentDoctorId ?? "",
    { skip: !currentDoctorId }
  );

  return {
    data: data ?? null,
    isLoading: !!currentDoctorId && isLoading,
    error: error ? rtkErrorMessage(error) : null,
    refresh: refetch,
  };
}
