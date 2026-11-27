import { apiGet, apiSend, errorText } from "./api";

export type DemoGradeCode = "I" | "II" | "III" | "IV" | "UNASSESSED";
export type DemoGrade = {
  id: string;
  assessment_revision_id: string;
  rule_version: string;
  functional_grade: DemoGradeCode;
  demo_training_mode: string | null;
  evidence: { marker: string; validity: string; sppb_total: number | null; assessment_id: string };
};
export type DemoAction = {
  id: string; name: string; category: string; demo_grade: string;
  explanation: string; steps: string[]; display_order: number; marker: "DEMO_ONLY";
};
export type DemoRunStatus = "in_progress" | "paused" | "awaiting_feedback" | "completed" | "stopped";
export type DemoRun = {
  id: string; participant_id: string; grade_result_id: string;
  status: DemoRunStatus;
  action_ids: string[]; completed_action_ids: string[] | null; current_index: number; started_at: string;
  ended_at: string | null; training_session_id: string | null;
};
export type DemoPlan = {
  participant_id: string; marker: "DEMO_ONLY";
  grade: DemoGrade | null; actions: DemoAction[]; current_run: DemoRun | null;
};

export const runStatusNames: Record<DemoRunStatus, string> = {
  in_progress: "进行中", paused: "已暂停", awaiting_feedback: "待填写反馈", completed: "已完成", stopped: "已中止",
};

export const gradeNames: Record<DemoGradeCode, string> = {
  I: "Ⅰ 级", II: "Ⅱ 级", III: "Ⅲ 级", IV: "Ⅳ 级", UNASSESSED: "未分级",
};

export function getDemoPlan(id: string, cookies: string) {
  return apiGet<DemoPlan>(`/participants/${encodeURIComponent(id)}/demo-plan`, cookies);
}
export function getDemoActions(cookies: string) {
  return apiGet<DemoAction[]>("/demo-actions", cookies);
}
export function getDemoRun(id: string, cookies: string) {
  return apiGet<DemoRun>(`/demo-runs/${encodeURIComponent(id)}`, cookies);
}

export function writeDemo<T>(path: string, body: object, cookies: string, key = crypto.randomUUID()) {
  return apiSend<T>(path, body, { key, cookie: cookies });
}

export function demoError(status: number) {
  return errorText(status, {
    403: "无权限、模拟同意已撤回，或会话已失效。",
    409: "训练状态已变化，请刷新页面。",
    422: "请先完成有效评估与反馈，并检查输入。",
  });
}
