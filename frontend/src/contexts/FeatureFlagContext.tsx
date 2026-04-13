import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getFeatureFlags, type FeatureFlags } from "../api/config";

interface FeatureFlagContextValue {
  aiSuggestionsEnabled: boolean;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  aiSuggestionsEnabled: false,
  isLoading: true,
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getFeatureFlags()
      .then(setFlags)
      .catch(() => setFlags({ ai_suggestions_enabled: false }))
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      aiSuggestionsEnabled: flags?.ai_suggestions_enabled ?? false,
      isLoading,
    }),
    [flags, isLoading]
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
