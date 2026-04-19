import type { SuggestionListResponse } from "../types/suggestion";
import { baseApi } from "./baseApi";

export type ListSuggestionsArg = {
  patientId: string;
  status?: string;
  documentId?: string;
  category?: string;
};

export const suggestionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSuggestions: builder.query<SuggestionListResponse, ListSuggestionsArg>({
      query: ({ patientId, status, documentId, category }) => {
        const q = new URLSearchParams();
        if (status) q.set("status", status);
        if (documentId) q.set("document_id", documentId);
        if (category) q.set("category", category);
        const qs = q.toString();
        return `/patients/${encodeURIComponent(patientId)}/suggestions${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_r, _e, arg) => [
        { type: "Suggestions", id: arg.patientId },
      ],
    }),
    acceptSuggestion: builder.mutation<
      void,
      { patientId: string; suggestionId: string }
    >({
      query: ({ patientId, suggestionId }) => ({
        url: `/patients/${encodeURIComponent(patientId)}/suggestions/${encodeURIComponent(suggestionId)}/accept`,
        method: "PUT",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Suggestions", id: arg.patientId },
      ],
    }),
    rejectSuggestion: builder.mutation<
      void,
      { patientId: string; suggestionId: string }
    >({
      query: ({ patientId, suggestionId }) => ({
        url: `/patients/${encodeURIComponent(patientId)}/suggestions/${encodeURIComponent(suggestionId)}/reject`,
        method: "PUT",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Suggestions", id: arg.patientId },
      ],
    }),
    acceptAllSuggestions: builder.mutation<
      void,
      { patientId: string; documentId?: string }
    >({
      query: ({ patientId, documentId }) => {
        const q = documentId
          ? `?document_id=${encodeURIComponent(documentId)}`
          : "";
        return {
          url: `/patients/${encodeURIComponent(patientId)}/suggestions/accept-all${q}`,
          method: "POST",
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Suggestions", id: arg.patientId },
      ],
    }),
    rejectAllSuggestions: builder.mutation<
      void,
      { patientId: string; documentId?: string }
    >({
      query: ({ patientId, documentId }) => {
        const q = documentId
          ? `?document_id=${encodeURIComponent(documentId)}`
          : "";
        return {
          url: `/patients/${encodeURIComponent(patientId)}/suggestions/reject-all${q}`,
          method: "POST",
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Suggestions", id: arg.patientId },
      ],
    }),
  }),
});

export const {
  useListSuggestionsQuery,
  useLazyListSuggestionsQuery,
  useAcceptSuggestionMutation,
  useRejectSuggestionMutation,
  useAcceptAllSuggestionsMutation,
  useRejectAllSuggestionsMutation,
} = suggestionsApi;
