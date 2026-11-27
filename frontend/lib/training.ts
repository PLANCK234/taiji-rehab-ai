import { apiGet, apiSend, errorText, type HttpMethod, type WriteResult } from "./api";

export { localTimeToUtc } from "./format";

export type TrainingSession = {
  id: string;
  participant_id: string;
  session_at: string;
  action_label: string;
  actual_minutes: number | null;
  completion_status: "completed" | "partial" | "interrupted" | "not_started";
  notes: string | null;
  source: "manual_staff_entry";
  recorded_by: string;
  recorded_at: string;
};

export type TrainingTimeline = {
  participant_id: string;
  entries: Array<{
    session_id: string;
    session_at: string;
    completion_status: TrainingSession["completion_status"];
    actual_minutes: number | null;
    feedback_state: "recorded" | "missing" | null;
    rpe: number | null;
  }>;
};

export type TrainingFeedback = {
  id: string;
  session_id: string;
  revision_no: number;
  state: "recorded" | "missing";
  missing_reason: "declined" | "interrupted" | "technical_failure" | "unknown" | null;
  rpe: number | null;
  difficulty: string | null;
  support: string | null;
  fatigue: string | null;
  discomfort: string | null;
  notes: string | null;
  change_reason: string | null;
  recorded_by: string;
  recorded_at: string;
};

export type SafetyEvent = {
  id: string;
  participant_id: string;
  session_id: string | null;
  event_at: string;
  description: string;
  recorded_by: string;
  recorded_at: string;
};

const read = apiGet;

export function getTrainingSessions(id: string, cookies: string, fetcher?: typeof fetch) {
  return read<TrainingSession[]>(
    `/participants/${encodeURIComponent(id)}/training-sessions`, cookies, fetcher,
  );
}

export function getTrainingTimeline(id: string, cookies: string, fetcher?: typeof fetch) {
  return read<TrainingTimeline>(
    `/participants/${encodeURIComponent(id)}/training-timeline`, cookies, fetcher,
  );
}

export function getTrainingSession(id: string, cookies: string, fetcher?: typeof fetch) {
  return read<TrainingSession>(`/training-sessions/${encodeURIComponent(id)}`, cookies, fetcher);
}

export function getTrainingFeedback(id: string, cookies: string, fetcher?: typeof fetch) {
  return read<TrainingFeedback[]>(
    `/training-sessions/${encodeURIComponent(id)}/feedback`, cookies, fetcher,
  );
}

export function getSafetyEvents(id: string, cookies: string, fetcher?: typeof fetch) {
  return read<SafetyEvent[]>(
    `/participants/${encodeURIComponent(id)}/safety-events`, cookies, fetcher,
  );
}

export function writeTraining<T>(
  path: string, body: object, key: string, cookieHeader: string,
  method: HttpMethod = "POST", fetcher: typeof fetch = fetch,
): Promise<WriteResult<T>> {
  return apiSend<T>(path, body, { key, cookie: cookieHeader, method, fetcher });
}

export function trainingError(status: number): string {
  return errorText(status, {
    403: "无操作权限、模拟同意已撤回，或会话已失效。",
    409: "记录已变化，请刷新后核对。",
    422: "请检查时间、缺失原因、RPE（6–20）与更正原因。",
  });
}


export const completionNames: Record<TrainingSession["completion_status"], string> = {
  completed: "完成", partial: "部分完成", interrupted: "中断", not_started: "未开始",
};

export const feedbackMissingNames: Record<NonNullable<TrainingFeedback["missing_reason"]>, string> = {
  declined: "拒绝反馈", interrupted: "训练中断", technical_failure: "技术故障", unknown: "原因未知",
};
