export type PatientPublication = {
  version: number;
  state: "published" | "withdrawn";
  marker: "SYNTHETIC_PROCESS_ONLY";
  message: string;
  video_status: "awaiting_review";
  card_code: string | null;
  card_title: string;
};

export type SyntheticCardOption = { code: string; title: string };

export type PatientHome = {
  study_code: string;
  publication: PatientPublication | null;
};

export async function getPublicationHistory(
  participantId: string,
  cookies: string,
): Promise<PatientPublication[] | null> {
  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    const response = await fetch(
      `${baseUrl}/api/v1/participants/${encodeURIComponent(participantId)}/demo-patient-publications`,
      { headers: { cookie: cookies }, cache: "no-store" },
    );
    return response.ok ? await response.json() as PatientPublication[] : null;
  } catch {
    return null;
  }
}

export async function getSyntheticCardOptions(
  participantId: string,
  cookies: string,
): Promise<SyntheticCardOption[] | null> {
  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    const response = await fetch(
      `${baseUrl}/api/v1/participants/${encodeURIComponent(participantId)}/demo-patient-card-options`,
      { headers: { cookie: cookies }, cache: "no-store" },
    );
    return response.ok ? await response.json() as SyntheticCardOption[] : null;
  } catch {
    return null;
  }
}
