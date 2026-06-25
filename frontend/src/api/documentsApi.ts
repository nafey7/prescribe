import type {
  DocumentListResponse,
  DocumentMetadata,
  DocumentUpdateRequest,
  LabAnalysisResponse,
} from "../types/document";
import { baseApi } from "./baseApi";

export type ListDocumentsArg = {
  patientId: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDocuments: builder.query<DocumentListResponse, ListDocumentsArg>({
      query: ({ patientId, category, page, pageSize }) => {
        const q = new URLSearchParams();
        if (category && category !== "all") q.set("category", category);
        if (page != null) q.set("page", String(page));
        if (pageSize != null) q.set("page_size", String(pageSize));
        const qs = q.toString();
        return `/patients/${encodeURIComponent(patientId)}/documents${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_r, _e, arg) => [
        { type: "Documents", id: arg.patientId },
      ],
    }),
    getDocumentMetadata: builder.query<
      DocumentMetadata,
      { patientId: string; documentId: string }
    >({
      query: ({ patientId, documentId }) =>
        `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/metadata`,
    }),
    deleteDocument: builder.mutation<
      void,
      { patientId: string; documentId: string }
    >({
      query: ({ patientId, documentId }) => ({
        url: `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Documents", id: arg.patientId },
      ],
    }),
    updateDocumentMetadata: builder.mutation<
      DocumentMetadata,
      {
        patientId: string;
        documentId: string;
        body: DocumentUpdateRequest;
      }
    >({
      query: ({ patientId, documentId, body }) => ({
        url: `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
        method: "PUT",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Documents", id: arg.patientId },
      ],
    }),
    getLabAnalysis: builder.query<
      LabAnalysisResponse,
      { patientId: string; documentId: string }
    >({
      query: ({ patientId, documentId }) =>
        `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/analysis`,
      providesTags: (_r, _e, arg) => [
        { type: "LabAnalysis", id: arg.documentId },
      ],
    }),
    retryLabAnalysis: builder.mutation<
      LabAnalysisResponse,
      { patientId: string; documentId: string }
    >({
      query: ({ patientId, documentId }) => ({
        url: `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/analysis`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "LabAnalysis", id: arg.documentId },
        { type: "Documents", id: arg.patientId },
      ],
    }),
  }),
});

export const {
  useListDocumentsQuery,
  useLazyGetDocumentMetadataQuery,
  useDeleteDocumentMutation,
  useUpdateDocumentMetadataMutation,
  useGetLabAnalysisQuery,
  useRetryLabAnalysisMutation,
} = documentsApi;
