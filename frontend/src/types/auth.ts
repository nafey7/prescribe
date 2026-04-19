/** Mirrors backend `app/schemas/auth.py` / enums. */

export type UserRole = "patient" | "doctor" | "admin";
export type UserStatus = string;

export interface MeResponse {
  user_id: string;
  role: UserRole;
  email: string;
  status: UserStatus;
  email_verified: boolean;
  profile_completed: boolean;
  patient_slug: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_expires_in: number;
}

export interface AuthSessionResponse extends TokenPair {
  user: MeResponse;
}

/** Payload for `AuthContext.signup` / `POST /api/auth/signup`. */
export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: "patient" | "doctor";
}
