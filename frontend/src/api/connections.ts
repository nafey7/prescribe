import { apiRequest } from "./client";

/** PUT /connections/{id}/accept — requires X-Doctor-Id or X-Patient-Id per initiator rules. */
export async function acceptConnection(connectionId: string): Promise<void> {
  await apiRequest(`/connections/${encodeURIComponent(connectionId)}/accept`, {
    method: "PUT",
  });
}

export async function rejectConnection(connectionId: string): Promise<void> {
  await apiRequest(`/connections/${encodeURIComponent(connectionId)}/reject`, {
    method: "PUT",
  });
}
