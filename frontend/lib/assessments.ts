import { apiGet, apiSend, errorText, type HttpMethod, type WriteResult } from "./api";

export { localTimeToUtc } from "./format";

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

export type AssessmentTrendEntry = {
  assessment_id: string;
  visit_kind: "baseline" | "revisit";
  created_at: string;
  current: AssessmentRevision;
  latest_confirmed: AssessmentRevision | null;
};

export type AssessmentTrend = {
  participant_id: string;
  entries: AssessmentTrendEntry[];
};

const readAssessment = apiGet;

export function getParticipantAssessments(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readAssessment<AssessmentSummary[]>(
    `/participants/${encodeURIComponent(id)}/assessments`, cookieHeader, fetcher,
  );
}

export function getAssessmentTrend(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readAssessment<AssessmentTrend>(
    `/participants/${encodeURIComponent(id)}/assessment-trend`, cookieHeader, fetcher,
  );
}

export function getAssessment(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readAssessment<AssessmentDetail>(`/assessments/${encodeURIComponent(id)}`, cookieHeader, fetcher);
}

export function writeAssessment<T>(
  path: string, body: object, key: string, cookieHeader: string,
  method: HttpMethod = "POST", fetcher: typeof fetch = fetch,
): Promise<WriteResult<T>> {
  return apiSend<T>(path, body, { key, cookie: cookieHeader, method, fetcher });
}

export function assessmentError(status: number): string {
  return errorText(status, {
    403: "没有此操作权限、模拟同意已撤回，或会话已失效。",
    409: "记录版本已变化，请刷新后重试。",
    422: "请核对总分（0–12）、测量时间、缺失原因与更正原因。",
  });
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

