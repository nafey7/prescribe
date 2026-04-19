import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useGetFeatureFlagsQuery } from "../api/configApi";

interface FeatureFlagContextValue {
  aiSuggestionsEnabled: boolean;
  /** Server policy: unauthenticated portal + legacy headers allowed (see backend `auth_bypass_allowed`). */
  authRelaxed: boolean;
  allowDoctorSelfSignup: boolean;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  aiSuggestionsEnabled: false,
  authRelaxed: false,
  allowDoctorSelfSignup: false,
  isLoading: true,
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useGetFeatureFlagsQuery();

  const value = useMemo(
    () => ({
      aiSuggestionsEnabled: isError
        ? false
        : (data?.ai_suggestions_enabled ?? false),
      authRelaxed: isError ? false : (data?.auth_relaxed ?? false),
      allowDoctorSelfSignup: isError
        ? false
        : (data?.allow_doctor_self_signup ?? false),
      isLoading,
    }),
    [
      data?.ai_suggestions_enabled,
      data?.auth_relaxed,
      data?.allow_doctor_self_signup,
      isError,
      isLoading,
    ]
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextValue {
  return useContext(FeatureFlagContext);
}
