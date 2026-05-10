/**
 * API barrel: RTK Query slices, legacy HTTP helpers (upload, SSE), and `client` utilities.
 * Importing from this module registers all `injectEndpoints` with `baseApi`.
 */
export * from "./client";
export * from "./baseApi";
export * from "./authApi";
export * from "./authSession";
export * from "./config";
export * from "./configApi";
export * from "./patientsApi";
export * from "./doctorsApi";
export * from "./connectionsApi";
export * from "./documentsApi";
export * from "./suggestionsApi";
export * from "./prescriptionsApi";
export * from "./chatApi";
export * from "./chat";
export * from "./chatStream";
export * from "./documents";
export * from "./doctors";
