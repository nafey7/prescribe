import type {
  DrugInteractionCheckRequest,
  DrugInteractionCheckResponse,
  Prescription,
  PrescriptionCreateRequest,
  PrescriptionStatus,
  PrescriptionStatusUpdateRequest,
  PrescriptionSuggestionRequest,
  PrescriptionSuggestionResponse,
} from "../types/doctor";
import { baseApi } from "./baseApi";

type ListArg = {
  doctorId: string;
  patientId: string;
  status?: PrescriptionStatus;
};

type SingleArg = {
  doctorId: string;
  patientId: string;
  prescriptionId: string;
};

type CreateArg = {
  doctorId: string;
  patientId: string;
  body: PrescriptionCreateRequest;
};

type UpdateStatusArg = SingleArg & { body: PrescriptionStatusUpdateRequest };

function prescriptionsBase(doctorId: string, patientId: string) {
  return `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/prescriptions`;
}

export const prescriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPrescriptions: builder.query<Prescription[], ListArg>({
      query: ({ doctorId, patientId, status }) => {
        const base = prescriptionsBase(doctorId, patientId);
        return status ? `${base}?status=${encodeURIComponent(status)}` : base;
      },
      providesTags: (_r, _e, { doctorId, patientId }) => [
        { type: "Prescriptions", id: `${doctorId}-${patientId}` },
      ],
    }),
    getPrescription: builder.query<Prescription, SingleArg>({
      query: ({ doctorId, patientId, prescriptionId }) =>
        `${prescriptionsBase(doctorId, patientId)}/${encodeURIComponent(prescriptionId)}`,
      providesTags: (_r, _e, { prescriptionId }) => [
        { type: "Prescriptions", id: prescriptionId },
      ],
    }),
    createPrescription: builder.mutation<Prescription, CreateArg>({
      query: ({ doctorId, patientId, body }) => ({
        url: prescriptionsBase(doctorId, patientId),
        method: "POST",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, { doctorId, patientId }) => [
        { type: "Prescriptions", id: `${doctorId}-${patientId}` },
        { type: "DoctorDashboard", id: doctorId },
      ],
    }),
    updatePrescriptionStatus: builder.mutation<Prescription, UpdateStatusArg>({
      query: ({ doctorId, patientId, prescriptionId, body }) => ({
        url: `${prescriptionsBase(doctorId, patientId)}/${encodeURIComponent(prescriptionId)}`,
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, { doctorId, patientId, prescriptionId }) => [
        { type: "Prescriptions", id: `${doctorId}-${patientId}` },
        { type: "Prescriptions", id: prescriptionId },
        { type: "DoctorDashboard", id: doctorId },
      ],
    }),
    cancelPrescription: builder.mutation<Prescription, SingleArg>({
      query: ({ doctorId, patientId, prescriptionId }) => ({
        url: `${prescriptionsBase(doctorId, patientId)}/${encodeURIComponent(prescriptionId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { doctorId, patientId, prescriptionId }) => [
        { type: "Prescriptions", id: `${doctorId}-${patientId}` },
        { type: "Prescriptions", id: prescriptionId },
        { type: "DoctorDashboard", id: doctorId },
      ],
    }),
    generatePrescriptionSuggestion: builder.mutation<
      PrescriptionSuggestionResponse,
      { doctorId: string; patientId: string; body: PrescriptionSuggestionRequest }
    >({
      query: ({ doctorId, patientId, body }) => ({
        url: `${prescriptionsBase(doctorId, patientId)}/suggest`,
        method: "POST",
        body: JSON.stringify(body),
      }),
    }),
    checkDrugInteractions: builder.mutation<
      DrugInteractionCheckResponse,
      { doctorId: string; patientId: string; body: DrugInteractionCheckRequest }
    >({
      query: ({ doctorId, patientId, body }) => ({
        url: `${prescriptionsBase(doctorId, patientId)}/check-interactions`,
        method: "POST",
        body: JSON.stringify(body),
      }),
    }),
  }),
});

export const {
  useListPrescriptionsQuery,
  useGetPrescriptionQuery,
  useCreatePrescriptionMutation,
  useUpdatePrescriptionStatusMutation,
  useCancelPrescriptionMutation,
  useGeneratePrescriptionSuggestionMutation,
  useCheckDrugInteractionsMutation,
} = prescriptionsApi;
