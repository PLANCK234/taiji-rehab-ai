export type PatientReview = {
  id: string;
  report_revision_id: string;
  review_no: number;
  result: "reviewed" | "unable";
  note: string;
  recorded_by: string;
  recorded_at: string;
};

export async function getPatientReviews(participantId: string, cookies: string): Promise<PatientReview[] | null> {
  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    const response = await fetch(`${baseUrl}/api/v1/participants/${encodeURIComponent(participantId)}/patient-report-reviews`, {
      headers: { cookie: cookies }, cache: "no-store",
    });
    return response.ok ? await response.json() as PatientReview[] : null;
  } catch {
    return null;
  }
}
