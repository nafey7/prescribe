import type { AuthSessionResponse, MeResponse, SignupInput } from "../types/auth";
import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      AuthSessionResponse,
      { email: string; password: string }
    >({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body: JSON.stringify(body),
        skipAuthRefresh: true,
      }),
    }),
    signup: builder.mutation<AuthSessionResponse, SignupInput>({
      query: (body) => ({
        url: "/auth/signup",
        method: "POST",
        body: JSON.stringify({
          first_name: body.firstName,
          last_name: body.lastName,
          email: body.email,
          password: body.password,
          confirm_password: body.confirmPassword,
          ...(body.role ? { role: body.role } : {}),
        }),
        skipAuthRefresh: true,
      }),
    }),
    refresh: builder.mutation<
      AuthSessionResponse,
      { refresh_token: string }
    >({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body: JSON.stringify(body),
        skipAuthRefresh: true,
      }),
    }),
    logout: builder.mutation<void, { refresh_token: string | null }>({
      query: (body) => ({
        url: "/auth/logout",
        method: "POST",
        body: JSON.stringify(body),
        skipAuthRefresh: true,
      }),
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => "/auth/me",
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = authApi;
