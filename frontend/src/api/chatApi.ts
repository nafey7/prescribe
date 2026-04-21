import type { ChatHistoryResponse, ChatResponse } from "../types/chat";
import type { ChatSessionSummary } from "../types/doctor";
import type { MealPlanShareResponse } from "../types/mealPlanShare";
import { baseApi } from "./baseApi";

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatHistory: builder.query<ChatHistoryResponse, string>({
      query: (chatId) => `/chat/history/${encodeURIComponent(chatId)}`,
      providesTags: (_r, _e, id) => [{ type: "Chat", id }],
    }),
    sendMessage: builder.mutation<
      ChatResponse,
      { message: string; chatId?: string }
    >({
      query: ({ message, chatId }) => ({
        url: "/chat/message",
        method: "POST",
        body: JSON.stringify({ message, chat_id: chatId }),
      }),
      invalidatesTags: (result) =>
        result?.chat_id
          ? [{ type: "Chat" as const, id: result.chat_id }]
          : [],
    }),
    getDoctorChatSessions: builder.query<
      ChatSessionSummary[],
      { doctorId: string; patientId: string }
    >({
      query: ({ doctorId, patientId }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/chat/sessions`,
        skipPatientHeader: true,
      }),
      providesTags: (_r, _e, arg) => [
        {
          type: "ChatSessions",
          id: `${arg.doctorId}-${arg.patientId}`,
        },
      ],
    }),
    getDoctorChatHistory: builder.query<
      ChatHistoryResponse,
      { doctorId: string; chatId: string }
    >({
      query: ({ doctorId, chatId }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/chat/history/${encodeURIComponent(chatId)}`,
        skipPatientHeader: true,
      }),
      providesTags: (_r, _e, arg) => [{ type: "Chat", id: arg.chatId }],
    }),
    sendDoctorChatMessage: builder.mutation<
      ChatResponse,
      {
        doctorId: string;
        patientId: string;
        message: string;
        chatId?: string;
      }
    >({
      query: ({ doctorId, patientId, message, chatId }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/chat/message`,
        method: "POST",
        body: JSON.stringify({ message, chat_id: chatId ?? null }),
        skipPatientHeader: true,
      }),
      invalidatesTags: (result, _err, arg) => {
        const tags: Array<
          { type: "Chat"; id: string } | { type: "ChatSessions"; id: string }
        > = [
          {
            type: "ChatSessions",
            id: `${arg.doctorId}-${arg.patientId}`,
          },
        ];
        const cid = result?.chat_id ?? arg.chatId;
        if (cid) tags.push({ type: "Chat", id: cid });
        return tags;
      },
    }),
    deleteDoctorChat: builder.mutation<
      void,
      { doctorId: string; patientId: string; chatId: string }
    >({
      query: ({ doctorId, patientId, chatId }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/chat/${encodeURIComponent(chatId)}`,
        method: "DELETE",
        skipPatientHeader: true,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "ChatSessions", id: `${arg.doctorId}-${arg.patientId}` },
        { type: "Chat", id: arg.chatId },
      ],
    }),
    getDoctorMealPlanPdf: builder.query<
      Blob,
      {
        doctorId: string;
        patientId: string;
        chatId: string;
        messageId: string;
      }
    >({
      query: ({ doctorId, patientId, chatId, messageId }) => {
        const q = new URLSearchParams({
          chat_id: chatId,
          message_id: messageId,
        });
        return {
          url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/chat/meal-plan/pdf?${q}`,
          method: "GET",
          skipPatientHeader: true,
          responseHandler: (response: Response) => response.blob(),
        };
      },
    }),
    createDoctorMealPlanShare: builder.mutation<
      MealPlanShareResponse,
      { doctorId: string; patientId: string; chatId: string; messageId: string }
    >({
      query: ({ doctorId, patientId, chatId, messageId }) => ({
        url: `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/meal-plan-shares`,
        method: "POST",
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        skipPatientHeader: true,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "MealPlanShares", id: arg.patientId },
      ],
    }),
  }),
});

export const {
  useGetChatHistoryQuery,
  useSendMessageMutation,
  useGetDoctorChatSessionsQuery,
  useGetDoctorChatHistoryQuery,
  useLazyGetDoctorChatHistoryQuery,
  useSendDoctorChatMessageMutation,
  useDeleteDoctorChatMutation,
  useLazyGetDoctorMealPlanPdfQuery,
  useCreateDoctorMealPlanShareMutation,
} = chatApi;
