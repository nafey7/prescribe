import { baseApi } from "./baseApi";

export const connectionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    acceptConnection: builder.mutation<void, string>({
      query: (connectionId) => ({
        url: `/connections/${encodeURIComponent(connectionId)}/accept`,
        method: "PUT",
      }),
      invalidatesTags: ["DoctorDashboard", "ConnectedPatients", "Connections"],
    }),
    rejectConnection: builder.mutation<void, string>({
      query: (connectionId) => ({
        url: `/connections/${encodeURIComponent(connectionId)}/reject`,
        method: "PUT",
      }),
      invalidatesTags: ["DoctorDashboard", "ConnectedPatients", "Connections"],
    }),
  }),
});

export const {
  useAcceptConnectionMutation,
  useRejectConnectionMutation,
} = connectionsApi;
