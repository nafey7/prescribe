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
import {
  persistDevRole,
  persistDoctorId,
  readStoredDevRole,
  readStoredDoctorId,
} from "../dev/devRoleStorage";
import { paths } from "../router/paths";
import type { DoctorInfo } from "../types/doctor";
import { useAuth } from "./AuthContext";
import { useFeatureFlags } from "./FeatureFlagContext";

export type DevRole = "patient" | "doctor";

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
  const { user } = useAuth();
  const { authRelaxed } = useFeatureFlags();

  const [currentRole, setCurrentRoleState] = useState<DevRole>(readStoredDevRole);
  const [currentDoctorId, setCurrentDoctorIdState] = useState<string | null>(
    readStoredDoctorId
  );
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  useEffect(() => {
    registerDoctorIdGetter(() => {
      if (user?.role === "doctor") return user.user_id;
      if (user?.role === "patient") return "";
      return currentRole === "doctor" && currentDoctorId ? currentDoctorId : "";
    });
  }, [user, currentRole, currentDoctorId]);

  useEffect(() => {
    if (!user) {
      setCurrentRoleState(readStoredDevRole());
      setCurrentDoctorIdState(readStoredDoctorId());
      return;
    }
    if (user.role === "doctor") {
      setCurrentRoleState("doctor");
      persistDevRole("doctor");
      setCurrentDoctorIdState(user.user_id);
      persistDoctorId(user.user_id);
    } else {
      setCurrentRoleState("patient");
      persistDevRole("patient");
    }
  }, [user]);

  const refreshDoctors = useCallback(async () => {
    if (!authRelaxed || user) {
      setDoctors([]);
      setIsDoctorsLoading(false);
      setDoctorsError(null);
      return;
    }
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
  }, [authRelaxed, user]);

  useEffect(() => {
    void refreshDoctors();
  }, [refreshDoctors]);

  useEffect(() => {
    if (!authRelaxed || user) return;
    if (doctors.length === 0) return;
    const ok = doctors.some((d) => d.id === currentDoctorId);
    if (!ok) {
      const next = doctors[0].id;
      setCurrentDoctorIdState(next);
      persistDoctorId(next);
    }
  }, [authRelaxed, user, doctors, currentDoctorId]);

  const setCurrentDoctorId = useCallback((id: string) => {
    setCurrentDoctorIdState(id);
    persistDoctorId(id);
  }, []);

  const setCurrentRole = useCallback(
    (role: DevRole) => {
      setCurrentRoleState(role);
      persistDevRole(role);
      if (role === "doctor") {
        navigate(paths.doctor.root, { replace: true });
      } else {
        navigate(paths.patient.root, { replace: true });
      }
    },
    [navigate]
  );

  const currentDoctor = useMemo((): DoctorInfo | null => {
    if (user?.role === "doctor") {
      const fromList = doctors.find((d) => d.id === currentDoctorId);
      if (fromList) return fromList;
      const local = user.email?.split("@")[0]?.trim();
      return {
        id: user.user_id,
        name: local || "Doctor",
        specialization: "",
        institution: null,
      };
    }
    return doctors.find((d) => d.id === currentDoctorId) ?? null;
  }, [user, doctors, currentDoctorId]);

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
