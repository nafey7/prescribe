import type { FeatureFlags } from "./config";
import { baseApi } from "./baseApi";

export const configApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureFlags: builder.query<FeatureFlags, void>({
      query: () => ({
        url: "/config/features",
        skipPatientHeader: true,
      }),
      providesTags: ["Config"],
    }),
  }),
});

export const { useGetFeatureFlagsQuery } = configApi;
