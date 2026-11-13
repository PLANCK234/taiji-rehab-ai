import type { PatientHome } from "../workspace/patient-publication";

export type PatientHomeResult =
  | { kind: "ready"; home: PatientHome }
  | { kind: "binding_unavailable" }
  | { kind: "session_expired" }
  | { kind: "service_unavailable" };

export async function readPatientHome(
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<PatientHomeResult> {
  try {
    const response = await fetcher(`${baseUrl}/api/v1/patient/me`, {
      headers: { cookie: cookieHeader }, cache: "no-store",
    });
    if (response.status === 401) return { kind: "session_expired" };
    if (response.status === 403) return { kind: "binding_unavailable" };
    if (!response.ok) return { kind: "service_unavailable" };
    return { kind: "ready", home: await response.json() as PatientHome };
  } catch {
    return { kind: "service_unavailable" };
  }
}
