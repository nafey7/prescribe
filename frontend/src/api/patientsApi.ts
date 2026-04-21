import type { Patient } from "../types/chat";
import type {
  MealPlanShareListResponse,
  MealPlanShareResponse,
} from "../types/mealPlanShare";
import type {
  MedicalHistory,
  PatientListResponse,
  PatientProfile,
  PatientUpdateRequest,
} from "../types/patient";
import { baseApi } from "./baseApi";

export const patientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPatients: builder.query<
      PatientListResponse,
      { skip?: number; limit?: number }
    >({
      query: ({ skip = 0, limit = 200 }) => {
        const q = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        return `/patients?${q}`;
      },
      providesTags: [{ type: "PatientList", id: "LIST" }],
    }),
    getPatientsForChat: builder.query<Patient[], void>({
      query: () => ({
        url: "/patients/for-chat",
        skipPatientHeader: true,
      }),
      providesTags: [{ type: "PatientList", id: "FOR_CHAT" }],
    }),
    getPatient: builder.query<PatientProfile, string>({
      query: (patientId) =>
        `/patients/${encodeURIComponent(patientId)}`,
      providesTags: (_r, _e, id) => [{ type: "Patient", id }],
    }),
    updatePatient: builder.mutation<
      PatientProfile,
      { patientId: string; body: PatientUpdateRequest }
    >({
      query: ({ patientId, body }) => ({
        url: `/patients/${encodeURIComponent(patientId)}`,
        method: "PUT",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, { patientId }) => [
        { type: "Patient", id: patientId },
        { type: "PatientList", id: "LIST" },
        { type: "PatientList", id: "FOR_CHAT" },
      ],
    }),
    getMedicalHistory: builder.query<MedicalHistory, string>({
      query: (patientId) =>
        `/patients/${encodeURIComponent(patientId)}/medical-history`,
      providesTags: (_r, _e, patientId) => [{ type: "Patient", id: patientId }],
    }),
    listPatientMealPlanShares: builder.query<
      MealPlanShareListResponse,
      { patientId: string; skip?: number; limit?: number }
    >({
      query: ({ patientId, skip = 0, limit = 50 }) => {
        const q = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        return `/patients/${encodeURIComponent(patientId)}/meal-plan-shares?${q}`;
      },
      providesTags: (_r, _e, arg) => [
        { type: "MealPlanShares", id: arg.patientId },
      ],
    }),
    getPatientMealPlanShare: builder.query<
      MealPlanShareResponse,
      { patientId: string; shareId: string }
    >({
      query: ({ patientId, shareId }) =>
        `/patients/${encodeURIComponent(patientId)}/meal-plan-shares/${encodeURIComponent(shareId)}`,
      providesTags: (_r, _e, arg) => [
        {
          type: "MealPlanShares",
          id: `${arg.patientId}-${arg.shareId}`,
        },
      ],
    }),
    getPatientMealPlanSharePdf: builder.query<
      Blob,
      { patientId: string; shareId: string }
    >({
      query: ({ patientId, shareId }) => ({
        url: `/patients/${encodeURIComponent(patientId)}/meal-plan-shares/${encodeURIComponent(shareId)}/pdf`,
        method: "GET",
        responseHandler: (response: Response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useListPatientsQuery,
  useLazyListPatientsQuery,
  useLazyGetPatientsForChatQuery,
  useGetPatientQuery,
  useUpdatePatientMutation,
  useGetMedicalHistoryQuery,
  useListPatientMealPlanSharesQuery,
  useGetPatientMealPlanShareQuery,
  useLazyGetPatientMealPlanSharePdfQuery,
} = patientsApi;
