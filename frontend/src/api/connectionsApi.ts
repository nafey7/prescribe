import type { ConnectionListResponse } from "../types/doctor";
import { baseApi } from "./baseApi";

export type GetConnectionsArg = {
  doctorId: string;
  status?: string;
  skip?: number;
  limit?: number;
};

export const connectionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConnections: builder.query<ConnectionListResponse, GetConnectionsArg>({
      query: ({ doctorId, status, skip, limit }) => {
        const q = new URLSearchParams();
        if (status) q.set("status", status);
        if (skip != null) q.set("skip", String(skip));
        if (limit != null) q.set("limit", String(limit));
        const qs = q.toString();
        return `/doctors/${encodeURIComponent(doctorId)}/connections${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_r, _e, arg) => [{ type: "Connections", id: arg.doctorId }],
    }),
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
  useGetConnectionsQuery,
  useAcceptConnectionMutation,
  useRejectConnectionMutation,
} = connectionsApi;
