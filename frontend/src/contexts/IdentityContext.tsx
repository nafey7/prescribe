import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { getDoctorsForDev } from "../api/doctors";
import { registerDoctorIdGetter } from "../api/client";
import type { DoctorInfo } from "../types/doctor";

const ROLE_KEY = "prescribe_dev_role";
const DOCTOR_ID_KEY = "prescribe_dev_doctor_id";

export type DevRole = "patient" | "doctor";

function readStoredRole(): DevRole {
  try {
    const v = localStorage.getItem(ROLE_KEY);
    if (v === "doctor" || v === "patient") return v;
  } catch {
    /* ignore */
  }
  return "patient";
}

function persistRole(role: DevRole): void {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* ignore */
  }
}

function readStoredDoctorId(): string | null {
  try {
    return localStorage.getItem(DOCTOR_ID_KEY);
  } catch {
    return null;
  }
}

function persistDoctorId(id: string): void {
  try {
    localStorage.setItem(DOCTOR_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

interface IdentityContextValue {
  currentRole: DevRole;
  currentDoctorId: string | null;
  currentDoctor: DoctorInfo | null;
  doctors: DoctorInfo[];
  isDoctorsLoading: boolean;
  doctorsError: string | null;
  setCurrentRole: (role: DevRole) => void;
  setCurrentDoctorId: (id: string) => void;
  /** Reload doctor list from `GET /api/doctors/for-dev` (e.g. after profile edit). */
  refreshDoctors: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [currentRole, setCurrentRoleState] = useState<DevRole>(readStoredRole);
  const [currentDoctorId, setCurrentDoctorIdState] = useState<string | null>(
    readStoredDoctorId
  );
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  registerDoctorIdGetter(() =>
    currentRole === "doctor" && currentDoctorId ? currentDoctorId : ""
  );

  const refreshDoctors = useCallback(async () => {
    setIsDoctorsLoading(true);
    setDoctorsError(null);
    try {
      const list = await getDoctorsForDev();
      setDoctors(list);
    } catch (e) {
      setDoctors([]);
      setDoctorsError(e instanceof Error ? e.message : "Failed to load doctors");
    } finally {
      setIsDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDoctors();
  }, [refreshDoctors]);

  useEffect(() => {
    if (doctors.length === 0) return;
    const ok = doctors.some((d) => d.id === currentDoctorId);
    if (!ok) {
      const next = doctors[0].id;
      setCurrentDoctorIdState(next);
      persistDoctorId(next);
    }
  }, [doctors, currentDoctorId]);

  const setCurrentDoctorId = useCallback((id: string) => {
    setCurrentDoctorIdState(id);
    persistDoctorId(id);
  }, []);

  const setCurrentRole = useCallback(
    (role: DevRole) => {
      setCurrentRoleState(role);
      persistRole(role);
      if (role === "doctor") {
        navigate("/doctor", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    },
    [navigate]
  );

  const currentDoctor = useMemo(
    () => doctors.find((d) => d.id === currentDoctorId) ?? null,
    [doctors, currentDoctorId]
  );

  const value = useMemo(
    () => ({
      currentRole,
      currentDoctorId,
      currentDoctor,
      doctors,
      isDoctorsLoading,
      doctorsError,
      setCurrentRole,
      setCurrentDoctorId,
      refreshDoctors,
    }),
    [
      currentRole,
      currentDoctorId,
      currentDoctor,
      doctors,
      isDoctorsLoading,
      doctorsError,
      setCurrentRole,
      setCurrentDoctorId,
      refreshDoctors,
    ]
  );

  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) {
    throw new Error("useIdentity must be used within IdentityProvider");
  }
  return ctx;
}
