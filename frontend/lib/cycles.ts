export type VisitRevision = {
  id: string;
  visit_id: string;
  revision_no: number;
  label: string;
  attendance: "unknown" | "attended" | "not_attended";
  assessment_state: "unknown" | "recorded" | "declined" | "not_measured";
  assessment_id: string | null;
  training_session_ids: string[];
  change_reason: string | null;
  recorded_at: string;
};

export type SyntheticCycle = { id: string; label: string; visits: VisitRevision[] };

export async function getCycles(participantId: string, cookies: string): Promise<SyntheticCycle[] | null> {
  try {
    const baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    const response = await fetch(
      `${baseUrl}/api/v1/participants/${encodeURIComponent(participantId)}/cycles`,
      { headers: { cookie: cookies }, cache: "no-store" },
    );
    return response.ok ? await response.json() as SyntheticCycle[] : null;
  } catch {
    return null;
  }
}

export const attendanceText = {
  unknown: "到访情况未知", attended: "已到访", not_attended: "未到访",
};
export const assessmentStateText = {
  unknown: "评估情况未知", recorded: "已关联人工评估",
  declined: "拒测", not_measured: "未测",
};
