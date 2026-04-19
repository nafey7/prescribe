import { useGetMedicalHistoryQuery } from "../api/patientsApi";
import { usePatientContext } from "../contexts/PatientContext";
import { rtkErrorMessage } from "../lib/rtkErrorMessage";
import type { MedicalHistory } from "../types/patient";

export function useMedicalHistory(): {
  data: MedicalHistory | null;
  isLoading: boolean;
  error: string | null;
} {
  const { currentPatientId } = usePatientContext();
  const { data, isLoading, error } = useGetMedicalHistoryQuery(
    currentPatientId,
    { skip: !currentPatientId }
  );

  return {
    data: data ?? null,
    isLoading: !!currentPatientId && isLoading,
    error: error ? rtkErrorMessage(error) : null,
  };
}
