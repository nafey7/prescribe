import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import {
  ensureFreshAccessToken,
  isAuthRefreshExemptPath,
} from "./authSession";
import { applyPrescribeHeaders, getApiBase } from "./client";

/** Per-request opt-out for routes that use path `patient_id` (e.g. doctor chat). */
export type PrescribeFetchArgs = FetchArgs & {
  skipPatientHeader?: boolean;
  /** Do not run 401 → refresh → retry (auth endpoints). */
  skipAuthRefresh?: boolean;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBase(),
  prepareHeaders(headers) {
    return headers;
  },
});

function urlFromFetchArgs(args: FetchArgs): string {
  if (typeof args.url === "string") {
    return args.url;
  }
  return "";
}

export const baseQuery: BaseQueryFn<
  string | PrescribeFetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const fetchArgs: FetchArgs =
    typeof args === "string" ? { url: args } : { ...args };

  const skipPatientHeader = (fetchArgs as PrescribeFetchArgs).skipPatientHeader;
  const skipAuthRefresh = (fetchArgs as PrescribeFetchArgs).skipAuthRefresh;
  if ("skipPatientHeader" in fetchArgs) {
    delete (fetchArgs as PrescribeFetchArgs).skipPatientHeader;
  }
  if ("skipAuthRefresh" in fetchArgs) {
    delete (fetchArgs as PrescribeFetchArgs).skipAuthRefresh;
  }

  const run = () => {
    const headers = new Headers(fetchArgs.headers as HeadersInit | undefined);
    applyPrescribeHeaders(headers, {
      skipPatientHeader,
      body: fetchArgs.body as BodyInit | null | undefined,
    });
    fetchArgs.headers = headers;
    return rawBaseQuery(fetchArgs, api, extraOptions);
  };

  let result = await run();

  const url = urlFromFetchArgs(fetchArgs);
  const exempt = skipAuthRefresh || isAuthRefreshExemptPath(url);

  if (result.error && result.error.status === 401 && !exempt) {
    const ok = await ensureFreshAccessToken();
    if (ok) {
      result = await run();
    }
  }

  return result;
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
    "Auth",
    "MealPlanShares",
    "FitnessPlanShares",
    "Prescriptions",
  ],
  endpoints: () => ({}),
});
