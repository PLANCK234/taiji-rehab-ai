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
  median_deg: number | null; range_p05_p95_deg: number | null; reason: string | null };
export type PoseResult = {
  status: "measured" | "not_assessable"; sampled_frames: number; single_pose_frames: number;
  multiple_pose_frames: number; duration_seconds: number; metrics: Record<string, Metric>;
};
export type PoseSummary = { id: string; participant_id: string; algorithm_version: string;
  input_sha256: string; created_at: string; result: PoseResult };
export type PoseReview = { id: string; revision_no: number; decision: string; reason: string;
  recorded_by: string; recorded_at: string };
export type PoseDetail = PoseSummary & { input_data: PoseInput; reviews: PoseReview[] };
export const jointNames: Record<string, string> = {
  left_elbow: "左肘", right_elbow: "右肘", left_shoulder: "左肩",
  right_shoulder: "右肩", left_knee: "左膝", right_knee: "右膝",
};
export const connections = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [28, 30], [30, 32]];

export async function getPoseHistory(id: string, cookie: string): Promise<PoseSummary[] | null> {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/participants/${encodeURIComponent(id)}/pose-analyses`, {
      headers: { cookie }, cache: "no-store",
    });
    return response.ok ? await response.json() as PoseSummary[] : null;
  } catch { return null; }
}
export function savePose(id: string, input: PoseInput) {
  return writeDemo<PoseSummary>(`/participants/${encodeURIComponent(id)}/pose-analyses`, input, document.cookie);
}
