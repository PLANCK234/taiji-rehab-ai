import { csrfFromCookies } from "./intake";

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

async function read<T>(
  path: string,
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<T | null> {
  try {
    const response = await fetcher(`${baseUrl}/api/v1${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export function getTrainingSessions(id: string, cookies: string, fetcher?: typeof fetch) {
  return read<TrainingSession[]>(
    `/participants/${encodeURIComponent(id)}/training-sessions`, cookies, fetcher,
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

export async function writeTraining<T>(
  path: string,
  body: object,
  key: string,
  cookieHeader: string,
  method: "POST" | "PUT" = "POST",
  fetcher: typeof fetch = fetch,
): Promise<{ status: number; value: T | null }> {
  const csrf = csrfFromCookies(cookieHeader);
  if (!csrf) return { status: 403, value: null };
  try {
    const response = await fetcher(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, value: response.ok ? ((await response.json()) as T) : null };
  } catch {
    return { status: 503, value: null };
  }
}

export function trainingError(status: number): string {
  if (status === 403) return "无访问权限、模拟同意不适用，或会话已失效。";
  if (status === 409) return "记录已变化或提交键冲突，请刷新核对。";
  if (status === 422) return "请检查时间、缺失原因、RPE 与更正原因。";
  return "服务暂不可用，请稍后重试。";
}

export function localTimeToUtc(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
