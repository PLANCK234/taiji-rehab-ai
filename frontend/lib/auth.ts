import { apiGet } from "./api";

export type Role = "clinician" | "clinical_approver" | "research_assistant" | "analyst" | "admin";
export type CurrentUser = { id: string; email: string; role: Role | string };
export type AssignedStudy = { id: string; code: string };

export async function getCurrentUser(
  cookieHeader: string, fetcher: typeof fetch = fetch, baseUrl?: string,
): Promise<CurrentUser | null> {
  if (!cookieHeader) return null;
  return apiGet<CurrentUser>("/auth/me", cookieHeader, fetcher, baseUrl);
}

export function getAssignedStudies(cookieHeader: string, fetcher: typeof fetch = fetch, baseUrl?: string) {
  return apiGet<AssignedStudy[]>("/studies", cookieHeader, fetcher, baseUrl);
}

export { roleLabel } from "./role-label";

/** UI hints only; the API enforces every permission again on the server. */
export const can = {
  write: (role: string) => role === "clinician" || role === "research_assistant",
  confirm: (role: string) => role === "clinician" || role === "clinical_approver",
  review: (role: string) => role === "clinician" || role === "clinical_approver",
  export: (role: string) => ["clinician", "research_assistant", "clinical_approver"].includes(role),
};
