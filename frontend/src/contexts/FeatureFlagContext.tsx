import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useGetFeatureFlagsQuery } from "../api/configApi";

interface FeatureFlagContextValue {
  aiSuggestionsEnabled: boolean;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  aiSuggestionsEnabled: false,
  isLoading: true,
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useGetFeatureFlagsQuery();

  const value = useMemo(
    () => ({
      aiSuggestionsEnabled: isError
        ? false
        : (data?.ai_suggestions_enabled ?? false),
      isLoading,
    }),
    [data?.ai_suggestions_enabled, isError, isLoading]
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
