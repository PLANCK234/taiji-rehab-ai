import { apiGet, apiSend } from "./api";
import { formatDateTime } from "./format";

export type TimingDecision = "accepted_timing" | "modified_timing" | "needs_retake" | "rejected";
export type TimingResult = { status: "candidate" | "not_assessable"; elapsed_seconds: number | null;
  start_ms: number | null; fifth_stand_ms: number | null; candidate_count: number;
  stand_timestamps_ms: number[]; failure_reasons: string[]; input_sha256: string;
  quality: { usable_frame_ratio: number; single_person_frame_ratio: number; mean_keypoint_visibility: number | null } };
export type TimingMeasurement = { id: string; source_analysis_id: string; algorithm_version: string;
  result: TimingResult; created_by: string; created_at: string };
export type TimingReview = { id: string; revision_no: number; decision: TimingDecision; reason: string;
  start_ms: number | null; fifth_stand_ms: number | null; recorded_by: string; recorded_at: string };
export type TimingDetail = TimingMeasurement & { reviews: TimingReview[]; human_confirmation: null | {
  evidence_type: "HUMAN_CONFIRMATION"; review_id: string; revision_no: number; start_ms: number;
  fifth_stand_ms: number; elapsed_seconds: number; recorded_by: string; recorded_at: string } };
export type TimingPage = { items: TimingMeasurement[]; total: number; offset: number; limit: number };

export const timingDecisions: Record<TimingDecision, string> = { accepted_timing: "确认AI候选计时",
  modified_timing: "修正起止后确认", needs_retake: "要求重测", rejected: "拒绝本次计时" };
export const timingReasons: Record<string, string> = {
  insufficient_visible_landmarks: "关键点不足，请调整取景后重测", insufficient_motion: "未识别到足够的坐站变化",
  fewer_than_five_stands: "未识别到五次完整候选站起", missing_landmarks_during_attempt: "测试期间关键点缺失",
  sampling_gap_during_attempt: "测试期间采样中断", hand_support_suspected: "疑似用手撑扶，请人工核对",
  arm_position_unknown: "手部不可见，无法核对手臂姿势", arms_not_crossed: "未识别到手臂交叉姿势",
  multiple_people_during_attempt: "测试期间出现多人", reported_support: "本次已记录扶持或辅助",
  manual_start_outside_first_rise: "人工起点不在首次起身之前，请核对起点",
};
export const timeText = (seconds: number | null | undefined) => seconds == null ? "未知" : `${Number(seconds.toFixed(3))} 秒`;
export const dateText = (date: string) => `${formatDateTime(date)}（北京时间）`;
export function getTimingPage(participantId: string, cookie: string) {
  return apiGet<TimingPage>(`/participants/${encodeURIComponent(participantId)}/sppb-measurements?limit=5`, cookie);
}
const timedFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};
export function readTiming<T>(path: string) { return apiGet<T>(path, "", timedFetch, ""); }
export function writeTiming<T>(path: string, body: object, key: string) { return apiSend<T>(path, body, { key, fetcher: timedFetch }); }

export function parseTimingSeconds(value: string, durationSeconds: number): number {
  if (!value.trim()) throw new Error("请填写时刻，空白不能当作零。");
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > durationSeconds) {
    throw new Error(`时刻需在 0 至 ${durationSeconds} 秒的录像范围内。`);
  }
  return Math.round(seconds * 1000);
}

export function timingReviewBody(detail: TimingDetail, decision: TimingDecision, reason: string,
  start: string, end: string, durationSeconds: number) {
  if (!reason.trim()) throw new Error("请填写坐站复核说明。");
  const body = { expected_revision: detail.reviews.at(-1)?.revision_no ?? 0, decision, reason: reason.trim(),
    start_ms: null as number | null, fifth_stand_ms: null as number | null };
  if (decision === "modified_timing") {
    body.start_ms = parseTimingSeconds(start, durationSeconds);
    body.fifth_stand_ms = parseTimingSeconds(end, durationSeconds);
    if (body.start_ms >= body.fifth_stand_ms) throw new Error("第五次站起时刻必须晚于起点。");
  }
  return body;
}
