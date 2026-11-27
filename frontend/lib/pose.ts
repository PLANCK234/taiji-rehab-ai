import { apiGet } from "./api";
import { writeDemo } from "./demo";

export type Point = { x: number; y: number; z: number; visibility: number };
export type PoseFrame = { timestamp_ms: number; landmarks: Point[]; pose_count: number };
export type PoseInput = {
  source: "synthetic_video" | "synthetic_camera";
  model_version: "mediapipe-pose-lite-float16-v1"; model_sha256: string;
  width: number; height: number;
  support: "unknown" | "standing" | "seated" | "supported"; frames: PoseFrame[];
};
export type Metric = { valid_frames: number; coverage: number; observed_seconds: number;
  median_deg: number | null; range_p05_p95_deg: number | null; reason: string | null;
  smoothed_range_p05_p95_deg?: number | null; noise_sigma_deg?: number | null;
  variation_status?: "insufficient_data" | "within_residual_noise" | "above_residual_noise" };
export type AngleSample = { timestamp_ms: number; angles: Record<string, number | null>;
  smoothed_angles?: Record<string, number | null> };
export type PoseResult = {
  status: "measured" | "not_assessable"; sampled_frames: number; single_pose_frames: number;
  multiple_pose_frames: number; duration_seconds: number; metrics: Record<string, Metric>;
  series?: AngleSample[];
  posture?: PosturePoints; symmetry?: Record<"elbow" | "shoulder" | "knee", SymmetryPair>;
};
/** pose-geometry-v3: trunk uprightness, pelvis travel (% of trunk length) and L/R balance. */
export type PosturePoints = { valid_frames: number; coverage: number;
  trunk_lean_median_deg: number | null; trunk_lean_range_p05_p95_deg: number | null;
  trunk_lean_variation_status: Metric["variation_status"];
  pelvis_lateral_range_pct_torso: number | null; pelvis_vertical_range_pct_torso: number | null;
  reason: string | null };
export type SymmetryPair = { left_range_deg: number | null; right_range_deg: number | null; difference_deg: number | null };
export type PoseSummary = { id: string; participant_id: string; algorithm_version: string;
  input_sha256: string; created_at: string; result: PoseResult };
export type PoseJoint = "left_elbow" | "right_elbow" | "left_shoulder" | "right_shoulder" | "left_knee" | "right_knee";
export type ReviewMetric = "median_deg" | "range_p05_p95_deg";
export type PoseCorrection = { joint: PoseJoint; metric: ReviewMetric;
  validity: "valid" | "missing"; value: number | null; reason: string };
export type ReviewDecision = "accepted_observations" | "modified_observations" | "needs_retake" | "rejected";
export type PoseReview = { id: string; revision_no: number; decision: ReviewDecision; reason: string;
  recorded_by: string; recorded_at: string; corrections: PoseCorrection[] };
export type PoseHumanConfirmation = { evidence_type: "HUMAN_CONFIRMATION"; review_id: string;
  revision_no: number; decision: "accepted_observations" | "modified_observations";
  metrics: Record<string, Record<ReviewMetric, number | null>> };
export type PoseDetail = PoseSummary & { input_data: PoseInput; reviews: PoseReview[];
  human_confirmation: PoseHumanConfirmation | null };
export const reviewMetricNames: Record<ReviewMetric, string> = {
  median_deg: "角度中位数", range_p05_p95_deg: "活动幅度P5–P95",
};
export const reviewDecisionNames: Record<ReviewDecision, string> = {
  accepted_observations: "确认观察指标", modified_observations: "修正后确认观察指标",
  needs_retake: "要求重录", rejected: "拒绝",
};
export const jointNames: Record<string, string> = {
  left_elbow: "左肘", right_elbow: "右肘", left_shoulder: "左肩",
  right_shoulder: "右肩", left_knee: "左膝", right_knee: "右膝",
};
export const connections = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [28, 30], [30, 32]];

export function getPoseHistory(id: string, cookie: string) {
  return apiGet<PoseSummary[]>(`/participants/${encodeURIComponent(id)}/pose-analyses`, cookie);
}
export function savePose(id: string, input: PoseInput, key: string) {
  return writeDemo<PoseSummary>(`/participants/${encodeURIComponent(id)}/pose-analyses`, input, document.cookie, key);
}
