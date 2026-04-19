import type {
  ConnectedPatientListResponse,
  DoctorDashboardResponse,
  DoctorProfile,
  DoctorUpdateRequest,
} from "../types/doctor";
import type { MedicalHistory, PatientProfile } from "../types/patient";
import { baseApi } from "./baseApi";

export type GetConnectedPatientsArg = {
  doctorId: string;
  search?: string;
  sort?: "recent" | "name" | "last_visit";
  skip?: number;
  limit?: number;
};

export const doctorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDoctor: builder.query<DoctorProfile, string>({
      query: (doctorId) =>
        `/doctors/${encodeURIComponent(doctorId)}`,
      providesTags: (_r, _e, id) => [{ type: "Doctor", id }],
    }),
    updateDoctor: builder.mutation<
      DoctorProfile,
      { doctorId: string; body: DoctorUpdateRequest }
    >({
      query: ({ doctorId, body }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}`,
        method: "PUT",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, { doctorId }) => [
        { type: "Doctor", id: doctorId },
        { type: "DoctorDashboard", id: doctorId },
      ],
    }),
    getDoctorDashboard: builder.query<DoctorDashboardResponse, string>({
      query: (doctorId) =>
        `/doctors/${encodeURIComponent(doctorId)}/dashboard`,
      providesTags: (_r, _e, id) => [{ type: "DoctorDashboard", id }],
    }),
    getConnectedPatients: builder.query<
      ConnectedPatientListResponse,
      GetConnectedPatientsArg
    >({
      query: ({ doctorId, search, sort, skip, limit }) => {
        const q = new URLSearchParams();
        if (search) q.set("search", search);
        if (sort) q.set("sort", sort);
        if (skip != null) q.set("skip", String(skip));
        if (limit != null) q.set("limit", String(limit));
        const qs = q.toString();
        return `/doctors/${encodeURIComponent(doctorId)}/patients${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_r, _e, arg) => [
        { type: "ConnectedPatients", id: arg.doctorId },
      ],
    }),
    getConnectedPatientProfile: builder.query<
      PatientProfile,
      { doctorId: string; patientId: string }
    >({
      query: ({ doctorId, patientId }) =>
        `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/profile`,
      providesTags: (_r, _e, { doctorId, patientId }) => [
        { type: "Patient", id: `conn-${doctorId}-${patientId}` },
      ],
    }),
    getConnectedPatientHistory: builder.query<
      MedicalHistory,
      { doctorId: string; patientId: string }
    >({
      query: ({ doctorId, patientId }) =>
        `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/medical-history`,
      providesTags: (_r, _e, { doctorId, patientId }) => [
        { type: "Patient", id: `conn-hist-${doctorId}-${patientId}` },
      ],
    }),
  }),
});

export const {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
  useGetDoctorDashboardQuery,
  useGetConnectedPatientsQuery,
  useGetConnectedPatientProfileQuery,
  useGetConnectedPatientHistoryQuery,
} = doctorsApi;
