import { csrfFromCookies } from "./intake";

export type DemoGrade = {
  id: string;
  assessment_revision_id: string;
  rule_version: string;
  functional_grade: "I" | "II" | "III" | "IV" | "UNASSESSED";
  demo_training_mode: string | null;
  evidence: { marker: string; validity: string; sppb_total: number | null; assessment_id: string };
};
export type DemoAction = {
  id: string; name: string; category: string; demo_grade: string;
  explanation: string; steps: string[]; display_order: number; marker: "DEMO_ONLY";
};
export type DemoRun = {
  id: string; participant_id: string; grade_result_id: string;
  status: "in_progress" | "paused" | "awaiting_feedback" | "completed" | "stopped";
  action_ids: string[]; completed_action_ids: string[] | null; current_index: number; started_at: string;
  ended_at: string | null; training_session_id: string | null;
};
export type DemoPlan = {
  participant_id: string; marker: "DEMO_ONLY";
  grade: DemoGrade | null; actions: DemoAction[]; current_run: DemoRun | null;
};

async function read<T>(path: string, cookies: string): Promise<T | null> {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1${path}`, {
      headers: { cookie: cookies }, cache: "no-store",
    });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}

export function getDemoPlan(id: string, cookies: string) {
  return read<DemoPlan>(`/participants/${encodeURIComponent(id)}/demo-plan`, cookies);
}
export function getDemoActions(cookies: string) {
  return read<DemoAction[]>("/demo-actions", cookies);
}
export function getDemoRun(id: string, cookies: string) {
  return read<DemoRun>(`/demo-runs/${encodeURIComponent(id)}`, cookies);
}

export async function writeDemo<T>(path: string, body: object, cookies: string): Promise<{ status: number; value: T | null }> {
  const csrf = csrfFromCookies(cookies);
  if (!csrf) return { status: 403, value: null };
  try {
    const response = await fetch(`/api/v1${path}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    });
    return { status: response.status, value: response.ok ? await response.json() as T : null };
  } catch { return { status: 503, value: null }; }
}

export function demoError(status: number) {
  if (status === 403) return "无权限、模拟同意已撤回，或会话失效。";
  if (status === 409) return "训练状态已变化，请刷新页面。";
  if (status === 422) return "请完成有效评估与反馈，并检查输入。";
  return "服务暂不可用，请稍后重试。";
}
