export type PatientReport = {
  id: string;
  report_id: string;
  participant_id: string;
  revision_no: number;
  observed_at: string;
  activity_state: "performed" | "not_performed" | "unknown";
  actual_minutes: number | null;
  discomfort_state: "reported" | "none" | "unknown";
  discomfort_note: string | null;
  change_reason: string | null;
  recorded_by: string;
  recorded_at: string;
};

export async function getPatientReports(cookies: string, participantId?: string): Promise<PatientReport[] | null> {
  const path = participantId
    ? `/participants/${encodeURIComponent(participantId)}/patient-reports`
    : "/patient/reports";
  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      headers: { cookie: cookies }, cache: "no-store",
    });
    return response.ok ? await response.json() as PatientReport[] : null;
  } catch {
    return null;
  }
}

export const activityText = {
  performed: "自报做了训练",
  not_performed: "自报未训练",
  unknown: "训练情况不清楚",
};
export const discomfortText = {
  reported: "自报有不适",
  none: "自报没有不适",
  unknown: "不适情况不清楚",
};
