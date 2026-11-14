export type PosePoint = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
};

export const LANDMARK_NAMES = [
  "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
  "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
  "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
  "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
  "right_heel", "left_foot_index", "right_foot_index",
] as const;

export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [11, 23],
  [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [29, 31],
  [27, 31], [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];

export const JOINT_DEFINITIONS = {
  left_shoulder: [13, 11, 23], right_shoulder: [14, 12, 24],
  left_elbow: [11, 13, 15], right_elbow: [12, 14, 16],
  left_hip: [11, 23, 25], right_hip: [12, 24, 26],
  left_knee: [23, 25, 27], right_knee: [24, 26, 28],
  left_ankle: [25, 27, 31], right_ankle: [26, 28, 32],
} as const;

export type JointName = keyof typeof JOINT_DEFINITIONS;
export type JointAngles = Record<JointName, number | null>;

export type PoseFrame = {
  timestampMs: number;
  detected: boolean;
  landmarks: PosePoint[];
  worldLandmarks: PosePoint[];
  angles: JointAngles;
};

export type JointRange = { minimum: number; maximum: number; range: number };
export type PoseSummary = {
  videoDurationMs: number;
  sampleHz: number;
  sampledFrames: number;
  detectedFrames: number;
  detectionRate: number;
  observedStartMs: number | null;
  observedEndMs: number | null;
  observedDurationMs: number | null;
  jointRanges: Partial<Record<JointName, JointRange>>;
};

const blankAngles = (): JointAngles => Object.fromEntries(
  Object.keys(JOINT_DEFINITIONS).map((name) => [name, null]),
) as JointAngles;

function usable(point: PosePoint | undefined) {
  return point !== undefined && (point.visibility ?? 1) >= 0.5 && (point.presence ?? 1) >= 0.5;
}

export function angleDegrees(a: PosePoint, b: PosePoint, c: PosePoint): number | null {
  if (![a, b, c].every(usable)) return null;
  const first = [a.x - b.x, a.y - b.y, a.z - b.z];
  const second = [c.x - b.x, c.y - b.y, c.z - b.z];
  const firstLength = Math.hypot(...first);
  const secondLength = Math.hypot(...second);
  if (firstLength === 0 || secondLength === 0) return null;
  const cosine = first.reduce((sum, value, index) => sum + value * second[index], 0)
    / (firstLength * secondLength);
  return Math.round(Math.acos(Math.max(-1, Math.min(1, cosine))) * 1800 / Math.PI) / 10;
}

export function createPoseFrame(
  timestampMs: number,
  landmarks: PosePoint[] = [],
  worldLandmarks: PosePoint[] = [],
): PoseFrame {
  if (landmarks.length !== 33 || worldLandmarks.length !== 33) {
    return { timestampMs, detected: false, landmarks: [], worldLandmarks: [], angles: blankAngles() };
  }
  const angles = blankAngles();
  for (const [name, [a, b, c]] of Object.entries(JOINT_DEFINITIONS) as
    Array<[JointName, readonly [number, number, number]]>) {
    angles[name] = angleDegrees(worldLandmarks[a], worldLandmarks[b], worldLandmarks[c]);
  }
  return { timestampMs, detected: true, landmarks, worldLandmarks, angles };
}

export function summarizePose(frames: PoseFrame[], videoDurationMs: number, sampleHz: number): PoseSummary {
  const detected = frames.filter((frame) => frame.detected);
  const jointRanges: PoseSummary["jointRanges"] = {};
  for (const name of Object.keys(JOINT_DEFINITIONS) as JointName[]) {
    const values = detected.map((frame) => frame.angles[name]).filter((value): value is number => value !== null);
    if (values.length) {
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      jointRanges[name] = { minimum, maximum, range: Math.round((maximum - minimum) * 10) / 10 };
    }
  }
  const first = detected.at(0)?.timestampMs ?? null;
  const last = detected.at(-1)?.timestampMs ?? null;
  return {
    videoDurationMs, sampleHz, sampledFrames: frames.length, detectedFrames: detected.length,
    detectionRate: frames.length ? detected.length / frames.length : 0,
    observedStartMs: first, observedEndMs: last,
    observedDurationMs: first === null || last === null ? null : Math.max(0, last - first),
    jointRanges,
  };
}

function midpoint(a: PosePoint | undefined, b: PosePoint | undefined) {
  return usable(a) && usable(b) ? { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 } : null;
}

export function trajectoryPoint(frame: PoseFrame, target: "pelvis" | "left_wrist" | "right_wrist" | "left_ankle" | "right_ankle") {
  if (!frame.detected) return null;
  if (target === "pelvis") return midpoint(frame.landmarks[23], frame.landmarks[24]);
  const index = { left_wrist: 15, right_wrist: 16, left_ankle: 27, right_ankle: 28 }[target];
  const point = frame.landmarks[index];
  return usable(point) ? { x: point.x, y: point.y } : null;
}

export function poseAnalysisJson(frames: PoseFrame[], summary: PoseSummary) {
  return JSON.stringify({
    schema_version: "pose-prototype-v1",
    model: "MediaPipe Pose Landmarker Full float16 v1",
    coordinate_notice: "Single-camera estimates; world depth is not clinically validated or metric-accurate.",
    summary,
    frames,
  }, null, 2);
}

export function poseAnalysisCsv(frames: PoseFrame[]) {
  const joints = Object.keys(JOINT_DEFINITIONS) as JointName[];
  const targets = ["pelvis", "left_wrist", "right_wrist", "left_ankle", "right_ankle"] as const;
  const header = ["timestamp_ms", "detected", ...joints.map((name) => `${name}_angle_deg`),
    ...targets.flatMap((target) => [`${target}_x_normalized`, `${target}_y_normalized`])];
  const rows = frames.map((frame) => {
    const trajectories = targets.flatMap((target) => {
      const point = trajectoryPoint(frame, target);
      return point ? [point.x.toFixed(6), point.y.toFixed(6)] : ["", ""];
    });
    return [frame.timestampMs.toFixed(1), frame.detected ? "1" : "0",
      ...joints.map((name) => frame.angles[name]?.toFixed(1) ?? ""), ...trajectories].join(",");
  });
  return [header.join(","), ...rows].join("\n");
}
