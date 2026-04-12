import { useEffect, useState } from "react";
import { getMedicalHistory } from "../api/patients";
import { usePatientContext } from "../contexts/PatientContext";
import type { MedicalHistory } from "../types/patient";

export function useMedicalHistory() {
  const { currentPatientId } = usePatientContext();
  const [data, setData] = useState<MedicalHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPatientId) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    getMedicalHistory(currentPatientId)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load dashboard")
      )
      .finally(() => setIsLoading(false));
  }, [currentPatientId]);

  return { data, isLoading, error };
}
