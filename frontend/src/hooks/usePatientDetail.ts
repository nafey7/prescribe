import { useEffect, useState } from "react";
import {
  getConnectedPatientHistory,
  getConnectedPatientProfile,
} from "../api/doctors";
import type { MedicalHistory } from "../types/patient";
import type { PatientProfile } from "../types/patient";

export function usePatientDetail(
  doctorId: string | null,
  patientId: string | undefined
) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [history, setHistory] = useState<MedicalHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId || !patientId) {
      setProfile(null);
      setHistory(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    Promise.all([
      getConnectedPatientProfile(doctorId, patientId),
      getConnectedPatientHistory(doctorId, patientId),
    ])
      .then(([p, h]) => {
        setProfile(p);
        setHistory(h);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load patient")
      )
      .finally(() => setIsLoading(false));
  }, [doctorId, patientId]);

  return { profile, history, isLoading, error };
}
