export type UserRole = "patient" | "doctor" | "admin";
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type MeResponse = {
  user_id: string;
  role: UserRole;
  email: string;
  status: string;
  email_verified: boolean;
  profile_completed: boolean;
  patient_slug: string | null;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_expires_in: number;
};

export type AuthSessionResponse = TokenPair & {
  user: MeResponse;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: "patient" | "doctor";
};
