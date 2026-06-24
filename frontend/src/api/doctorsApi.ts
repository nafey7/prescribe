import type {
  ConnectedPatientListResponse,
  DoctorDashboardResponse,
  DoctorProfile,
  DoctorUpdateRequest,
  PreVisitBrief,
} from "../types/doctor";
import type { MedicalHistory, PatientProfile } from "../types/patient";
import type {
  ClinicalNote,
  ClinicalNoteCorrection,
  ClinicalNoteCreateRequest,
  ClinicalNoteDraft,
  ClinicalNoteGenerateRequest,
  ClinicalNoteListResponse,
} from "../types/clinicalNote";
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
    listDoctorClinicalNotes: builder.query<
      ClinicalNoteListResponse,
      { doctorId: string; patientId: string; skip?: number; limit?: number }
    >({
      query: ({ doctorId, patientId, skip = 0, limit = 50 }) =>
        `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/clinical-notes?skip=${skip}&limit=${limit}`,
      providesTags: (_r, _e, { doctorId, patientId }) => [
        { type: "ClinicalNotes", id: `doctor-${doctorId}-${patientId}` },
      ],
    }),
    generateClinicalNoteDraft: builder.mutation<
      ClinicalNoteDraft,
      { doctorId: string; patientId: string; body: ClinicalNoteGenerateRequest }
    >({
      query: ({ doctorId, patientId, body }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/clinical-notes/generate`,
        method: "POST",
        body: JSON.stringify(body),
      }),
    }),
    publishClinicalNote: builder.mutation<
      ClinicalNote,
      { doctorId: string; patientId: string; body: ClinicalNoteCreateRequest }
    >({
      query: ({ doctorId, patientId, body }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/clinical-notes`,
        method: "POST",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, { doctorId, patientId }) => [
        { type: "ClinicalNotes", id: `doctor-${doctorId}-${patientId}` },
        { type: "ClinicalNotes", id: `patient-${patientId}` },
      ],
    }),
    reviseClinicalNote: builder.mutation<
      ClinicalNote,
      {
        doctorId: string;
        patientId: string;
        noteId: string;
        body: { title?: string; content?: string };
      }
    >({
      query: ({ doctorId, patientId, noteId, body }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/clinical-notes/${encodeURIComponent(noteId)}`,
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, { doctorId, patientId, noteId }) => [
        { type: "ClinicalNotes", id: `doctor-${doctorId}-${patientId}` },
        { type: "ClinicalNotes", id: `patient-${patientId}` },
        { type: "ClinicalNotes", id: noteId },
      ],
    }),
    resolveClinicalNoteCorrection: builder.mutation<
      ClinicalNoteCorrection,
      {
        doctorId: string;
        patientId: string;
        noteId: string;
        correctionId: string;
        resolutionNote: string;
      }
    >({
      query: ({ doctorId, patientId, noteId, correctionId, resolutionNote }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/clinical-notes/${encodeURIComponent(noteId)}/correction-requests/${encodeURIComponent(correctionId)}/resolve`,
        method: "POST",
        body: JSON.stringify({ resolution_note: resolutionNote }),
      }),
      invalidatesTags: (_r, _e, { doctorId, patientId, noteId }) => [
        { type: "ClinicalNotes", id: `doctor-${doctorId}-${patientId}` },
        { type: "ClinicalNotes", id: `patient-${patientId}` },
        { type: "ClinicalNotes", id: noteId },
      ],
    }),
    generatePreVisitBrief: builder.mutation<
      PreVisitBrief,
      { doctorId: string; patientId: string }
    >({
      query: ({ doctorId, patientId }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/pre-visit-brief`,
        method: "POST",
        skipPatientHeader: true,
      }),
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
  useListDoctorClinicalNotesQuery,
  useGenerateClinicalNoteDraftMutation,
  usePublishClinicalNoteMutation,
  useReviseClinicalNoteMutation,
  useResolveClinicalNoteCorrectionMutation,
  useGeneratePreVisitBriefMutation,
} = doctorsApi;
