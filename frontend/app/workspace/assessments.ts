import { csrfFromCookies } from "./intake";

export type MissingReason =
  | "not_scheduled" | "not_attempted" | "declined" | "unsafe_to_attempt"
  | "technical_failure" | "lost_followup" | "unknown";

export type AssessmentRevision = {
  id: string;
  assessment_id: string;
  revision_no: number;
  state: "draft" | "confirmed";
  metric_code: "sppb_total";
  raw_value: number | null;
  unit: "points";
  validity: "unrecorded" | "valid" | "missing" | "invalid";
  missing_reason: MissingReason | null;
  performed_at: string | null;
  source: "manual_staff_entry";
  change_reason: string | null;
  recorded_by: string;
  recorded_at: string;
};

export type AssessmentSummary = {
  id: string;
  participant_id: string;
  visit_kind: "baseline" | "revisit";
  protocol_version: string;
  created_by: string;
  created_at: string;
  current: AssessmentRevision;
};

export type AssessmentDetail = AssessmentSummary & { history: AssessmentRevision[] };

async function readAssessment<T>(
  path: string,
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<T | null> {
  try {
    const response = await fetcher(`${baseUrl}/api/v1${path}`, {
      headers: { cookie: cookieHeader }, cache: "no-store",
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export function getParticipantAssessments(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readAssessment<AssessmentSummary[]>(
    `/participants/${encodeURIComponent(id)}/assessments`, cookieHeader, fetcher,
  );
}

export function getAssessment(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readAssessment<AssessmentDetail>(`/assessments/${encodeURIComponent(id)}`, cookieHeader, fetcher);
}

export async function writeAssessment<T>(
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

export function assessmentError(status: number): string {
  if (status === 403) return "没有此操作权限、同意已撤回，或会话已失效。";
  if (status === 409) return "记录版本已变化，请刷新后重试。";
  if (status === 422) return "输入无效；请核对总分、时间、缺失原因与更正原因。";
  return "服务暂不可用，请稍后重试。";
}

export const missingReasonText: Record<MissingReason, string> = {
  not_scheduled: "未安排", not_attempted: "未尝试", declined: "拒测",
  unsafe_to_attempt: "未执行（安全原因）", technical_failure: "技术故障",
  lost_followup: "失访", unknown: "原因未知",
};

export function measurementText(row: AssessmentRevision): string {
  if (row.validity === "unrecorded") return "未录入";
  if (row.validity === "missing") return `缺失（${missingReasonText[row.missing_reason ?? "unknown"]}）`;
  if (row.validity === "invalid") {
    const raw = row.raw_value === null ? "无原始值" : `原始值 ${row.raw_value} 分`;
    return `无效（${raw}；${missingReasonText[row.missing_reason ?? "unknown"]}）`;
  }
  return `${row.raw_value} 分`;
}

export function localTimeToUtc(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
