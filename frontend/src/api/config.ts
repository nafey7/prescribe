import { apiRequest } from "./client";

export interface FeatureFlags {
  ai_suggestions_enabled: boolean;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return apiRequest<FeatureFlags>("/config/features", {
    skipPatientHeader: true,
  });
}
