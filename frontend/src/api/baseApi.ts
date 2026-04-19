import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { applyPrescribeHeaders, getApiBase } from "./client";

/** Per-request opt-out for routes that use path `patient_id` (e.g. doctor chat). */
export type PrescribeFetchArgs = FetchArgs & {
  skipPatientHeader?: boolean;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBase(),
  prepareHeaders(headers) {
    return headers;
  },
});

export const baseQuery: BaseQueryFn<
  string | PrescribeFetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const fetchArgs: FetchArgs =
    typeof args === "string" ? { url: args } : { ...args };

  const skipPatientHeader = (fetchArgs as PrescribeFetchArgs).skipPatientHeader;
  if ("skipPatientHeader" in fetchArgs) {
    delete (fetchArgs as PrescribeFetchArgs).skipPatientHeader;
  }

  const headers = new Headers(fetchArgs.headers as HeadersInit | undefined);
  applyPrescribeHeaders(headers, {
    skipPatientHeader,
    body: fetchArgs.body as BodyInit | null | undefined,
  });
  fetchArgs.headers = headers;

  return rawBaseQuery(fetchArgs, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Patient",
    "PatientList",
    "Doctor",
    "DoctorDashboard",
    "ConnectedPatients",
    "Documents",
    "Chat",
    "ChatSessions",
    "Config",
    "Suggestions",
    "Connections",
  ],
  endpoints: () => ({}),
});
