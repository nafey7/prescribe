import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { registerPatientIdGetter } from "../api/client";
import {
  useLazyGetPatientsForChatQuery,
  useLazyListPatientsQuery,
} from "../api/patientsApi";
import type { Patient } from "../types/chat";

const STORAGE_KEY = "prescribe_dev_patient_id";

function readStoredPatientId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistPatientId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

interface PatientContextValue {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
  refreshPatients: () => Promise<void>;
  currentPatientId: string;
  setCurrentPatientId: (id: string) => void;
  currentPatient: Patient | null;
}

const PatientContext = createContext<PatientContextValue | null>(null);

function mapProfilesToPatients(
  items: import("../types/patient").PatientProfile[]
): Patient[] {
  return items.map((p) => {
    const slug = p.patient_slug || p.user_id;
    const name = `${p.first_name} ${p.last_name}`.trim() || slug;
    return {
      id: slug,
      name,
      file: `patient_${slug}.md`,
      user_id: p.user_id,
    };
  });
}

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPatientId, setCurrentPatientIdState] = useState(() => {
    return readStoredPatientId() ?? "john_doe";
  });

  const [triggerList] = useLazyListPatientsQuery();
  const [triggerForChat] = useLazyGetPatientsForChatQuery();

  registerPatientIdGetter(() => currentPatientId);

  const setCurrentPatientId = useCallback((id: string) => {
    setCurrentPatientIdState(id);
    persistPatientId(id);
  }, []);

  const refreshPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await triggerList({ skip: 0, limit: 200 }).unwrap();
      if (res.items.length > 0) {
        setPatients(mapProfilesToPatients(res.items));
        return;
      }
      const fallback = await triggerForChat().unwrap();
      setPatients(fallback);
    } catch (e) {
      try {
        const fallback = await triggerForChat().unwrap();
        setPatients(fallback);
        setError(null);
      } catch {
        setPatients([]);
        setError(e instanceof Error ? e.message : "Failed to load patients");
      }
    } finally {
      setIsLoading(false);
    }
  }, [triggerList, triggerForChat]);

  useEffect(() => {
    void refreshPatients();
  }, [refreshPatients]);

  useEffect(() => {
    if (patients.length === 0) return;
    const ok = patients.some((p) => p.id === currentPatientId);
    if (!ok) {
      const next = patients[0].id;
      setCurrentPatientIdState(next);
      persistPatientId(next);
    }
  }, [patients, currentPatientId]);

  const currentPatient = useMemo(
    () => patients.find((p) => p.id === currentPatientId) ?? null,
    [patients, currentPatientId]
  );

  const value = useMemo(
    () => ({
      patients,
      isLoading,
      error,
      refreshPatients,
      currentPatientId,
      setCurrentPatientId,
      currentPatient,
    }),
    [
      patients,
      isLoading,
      error,
      refreshPatients,
      currentPatientId,
      setCurrentPatientId,
      currentPatient,
    ]
  );

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
}

export function usePatients(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) {
    throw new Error("usePatients must be used within PatientProvider");
  }
  return ctx;
}

export function usePatientContext(): PatientContextValue {
  return usePatients();
}
