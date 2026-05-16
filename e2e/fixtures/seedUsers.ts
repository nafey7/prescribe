import { PW_DOCTOR_EMAIL, PW_PASSWORD, PW_PATIENT_EMAIL } from "../utils/env";

export type SeedUser = {
  email: string;
  password: string;
  role: "patient" | "doctor";
};

export const PATIENT_USER: SeedUser = {
  email: PW_PATIENT_EMAIL,
  password: PW_PASSWORD,
  role: "patient",
};

export const DOCTOR_USER: SeedUser = {
  email: PW_DOCTOR_EMAIL,
  password: PW_PASSWORD,
  role: "doctor",
};
