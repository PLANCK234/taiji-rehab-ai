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
export type LandmarkName = typeof LANDMARK_NAMES[number];
export const MIN_POINT_CONFIDENCE = 0.5;

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

export type ManualPoseAnnotation = {
  id: string;
  timestampMs: number;
  eventLabel: string;
  repeatIndex: number | null;
  phaseLabel: string;
  referenceJoint: JointName | null;
  manualReferenceAngleDeg: number | null;
  modelReferenceAngleDeg: number | null;
  note: string;
};

export type AngleDifferenceStats = {
  count: number;
  meanAbsoluteDifferenceDeg: number | null;
  medianAbsoluteDifferenceDeg: number | null;
  maximumAbsoluteDifferenceDeg: number | null;
};

export type ManualAngleComparisonSummary = {
  totalAnnotations: number;
  missingManualAngleAnnotations: number;
  missingModelAngleAnnotations: number;
  overall: AngleDifferenceStats;
  byJoint: Partial<Record<JointName, AngleDifferenceStats>>;
};

export type JointRange = { minimum: number; maximum: number; range: number };
export type JointAnglePoint = { timestampMs: number; angleDeg: number };
export type PoseSummary = {
  videoDurationMs: number;
  sampleHz: number;
  sampledFrames: number;
  detectedFrames: number;
  detectionRate: number;
  observedStartMs: number | null;
  observedEndMs: number | null;
  observedDurationMs: number | null;
  longestConsecutiveMissedSamples: number;
  landmarkCoverage: Record<LandmarkName, number>;
  jointAngleCoverage: Record<JointName, number>;
  jointRanges: Partial<Record<JointName, JointRange>>;
};

const blankAngles = (): JointAngles => Object.fromEntries(
  Object.keys(JOINT_DEFINITIONS).map((name) => [name, null]),
) as JointAngles;

function usable(point: PosePoint | undefined) {
  return point !== undefined
    && (point.visibility ?? 1) >= MIN_POINT_CONFIDENCE
    && (point.presence ?? 1) >= MIN_POINT_CONFIDENCE;
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

export function liveFraming(frame: PoseFrame): "missing" | "full" | "one-side" | "partial" {
  if (!frame.detected) return "missing";
  const visibleInFrame = (index: number) => {
    const point = frame.landmarks[index];
    return (point.visibility ?? 1) >= MIN_POINT_CONFIDENCE
      && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
  };
  if ([0, 27, 28, 31, 32].every(visibleInFrame)) return "full";
  const visibleSide = [[11, 23, 25, 27, 31], [12, 24, 26, 28, 32]]
    .some((side) => side.every(visibleInFrame));
  return visibleSide ? "one-side" : "partial";
}

export function summarizePose(frames: PoseFrame[], videoDurationMs: number, sampleHz: number): PoseSummary {
  const detected = frames.filter((frame) => frame.detected);
  const jointRanges: PoseSummary["jointRanges"] = {};
  const jointAngleCoverage = {} as PoseSummary["jointAngleCoverage"];
  for (const name of Object.keys(JOINT_DEFINITIONS) as JointName[]) {
    const values = detected.map((frame) => frame.angles[name]).filter((value): value is number => value !== null);
    jointAngleCoverage[name] = frames.length ? values.length / frames.length : 0;
    if (values.length) {
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      jointRanges[name] = { minimum, maximum, range: Math.round((maximum - minimum) * 10) / 10 };
    }
  }
  const first = detected.at(0)?.timestampMs ?? null;
  const last = detected.at(-1)?.timestampMs ?? null;
  const landmarkCoverage = Object.fromEntries(LANDMARK_NAMES.map((name, index) => [name,
    frames.length ? frames.filter((frame) => frame.detected && usable(frame.landmarks[index])).length / frames.length : 0,
  ])) as PoseSummary["landmarkCoverage"];
  let currentMissedSamples = 0;
  let longestConsecutiveMissedSamples = 0;
  for (const frame of frames) {
    currentMissedSamples = frame.detected ? 0 : currentMissedSamples + 1;
    longestConsecutiveMissedSamples = Math.max(longestConsecutiveMissedSamples, currentMissedSamples);
  }
  return {
    videoDurationMs, sampleHz, sampledFrames: frames.length, detectedFrames: detected.length,
    detectionRate: frames.length ? detected.length / frames.length : 0,
    observedStartMs: first, observedEndMs: last,
    observedDurationMs: first === null || last === null ? null : Math.max(0, last - first),
    longestConsecutiveMissedSamples, landmarkCoverage, jointAngleCoverage, jointRanges,
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

export function nearestPoseFrame(frames: PoseFrame[], timestampMs: number) {
  return frames.reduce<PoseFrame | undefined>((nearest, frame) => (
    nearest === undefined || Math.abs(frame.timestampMs - timestampMs) < Math.abs(nearest.timestampMs - timestampMs)
      ? frame : nearest
  ), undefined);
}

export function jointAngleSegments(frames: PoseFrame[], joint: JointName): JointAnglePoint[][] {
  const segments: JointAnglePoint[][] = [];
  let current: JointAnglePoint[] = [];
  for (const frame of frames) {
    const angle = frame.angles[joint];
    if (angle === null) {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    current.push({ timestampMs: frame.timestampMs, angleDeg: angle });
  }
  if (current.length) segments.push(current);
  return segments;
}

export function timelinePositionRatio(timestampMs: number, durationMs: number) {
  if (!Number.isFinite(timestampMs) || !Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, timestampMs / durationMs));
}

export function absoluteAngleDifference(manualAngleDeg: number | null, modelAngleDeg: number | null) {
  return manualAngleDeg === null || modelAngleDeg === null
    ? null
    : Math.abs(manualAngleDeg - modelAngleDeg);
}

function angleDifferenceStats(values: number[]): AngleDifferenceStats {
  if (!values.length) return {
    count: 0,
    meanAbsoluteDifferenceDeg: null,
    medianAbsoluteDifferenceDeg: null,
    maximumAbsoluteDifferenceDeg: null,
  };
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    count: sorted.length,
    meanAbsoluteDifferenceDeg: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    medianAbsoluteDifferenceDeg: median,
    maximumAbsoluteDifferenceDeg: sorted.at(-1)!,
  };
}

export function summarizeManualAngleComparisons(annotations: ManualPoseAnnotation[]): ManualAngleComparisonSummary {
  const differences = annotations.map((annotation) => ({
    joint: annotation.referenceJoint,
    value: absoluteAngleDifference(annotation.manualReferenceAngleDeg, annotation.modelReferenceAngleDeg),
  }));
  const byJoint = Object.fromEntries((Object.keys(JOINT_DEFINITIONS) as JointName[]).flatMap((joint) => {
    const values = differences.filter((item) => item.joint === joint && item.value !== null).map((item) => item.value!);
    return values.length ? [[joint, angleDifferenceStats(values)]] : [];
  })) as Partial<Record<JointName, AngleDifferenceStats>>;
  return {
    totalAnnotations: annotations.length,
    missingManualAngleAnnotations: annotations.filter((annotation) => annotation.manualReferenceAngleDeg === null).length,
    missingModelAngleAnnotations: annotations.filter((annotation) => annotation.modelReferenceAngleDeg === null).length,
    overall: angleDifferenceStats(differences.flatMap((item) => item.value === null ? [] : [item.value])),
    byJoint,
  };
}

export function poseComparisonSummaryJson(annotations: ManualPoseAnnotation[]) {
  return JSON.stringify({
    schema_version: "pose-comparison-summary-v1",
    interpretation_notice: "Descriptive technical differences only; no quality or clinical interpretation.",
    summary: summarizeManualAngleComparisons(annotations),
  }, null, 2);
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

export function poseAnnotationTemplateCsv(frames: PoseFrame[]) {
  const header = [
    "timestamp_ms", "model_detected", "manual_event_label", "manual_repeat_index",
    "manual_phase_label", "manual_reference_joint", "manual_reference_angle_deg",
    "model_reference_angle_deg", "absolute_angle_difference_deg", "reviewer_note",
  ];
  const rows = frames.map((frame) => [
    frame.timestampMs.toFixed(1), frame.detected ? "1" : "0", "", "", "", "", "", "", "", "",
  ].join(","));
  return [header.join(","), ...rows].join("\n");
}

function safeCsvCell(value: string | number | null) {
  if (value === null) return "";
  let text = String(value).replace(/\r\n?/g, "\n");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const MANUAL_ANNOTATION_CSV_HEADER = [
  "timestamp_ms", "manual_event_label", "manual_repeat_index", "manual_phase_label",
  "manual_reference_joint", "manual_reference_angle_deg", "model_reference_angle_deg",
  "absolute_angle_difference_deg", "reviewer_note",
];

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = false;
      } else cell += character;
    } else if (character === '"') {
      if (cell.length) throw new Error("CSV 引号格式无效。");
      quoted = true;
    } else if (character === ",") {
      row.push(cell); cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else cell += character;
  }
  if (quoted) throw new Error("CSV 存在未闭合的引号。");
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function restoredCsvText(value: string) {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

export function parsePoseManualAnnotationsCsv(text: string, durationMs: number): ManualPoseAnnotation[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (!rows.length || rows[0].join(",") !== MANUAL_ANNOTATION_CSV_HEADER.join(",")) {
    throw new Error("CSV 表头不匹配，请选择本系统导出的已标注 CSV。");
  }
  return rows.slice(1).map((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== MANUAL_ANNOTATION_CSV_HEADER.length) throw new Error(`CSV 第 ${rowNumber} 行列数不正确。`);
    const timestampMs = Number(values[0]);
    if (!Number.isFinite(timestampMs) || timestampMs < 0 || timestampMs > durationMs) {
      throw new Error(`CSV 第 ${rowNumber} 行时间超出当前视频范围。`);
    }
    const eventLabel = restoredCsvText(values[1]);
    if (!eventLabel.trim()) throw new Error(`CSV 第 ${rowNumber} 行缺少事件标签。`);
    const repeatIndex = values[2] === "" ? null : Number(values[2]);
    if (repeatIndex !== null && (!Number.isInteger(repeatIndex) || repeatIndex <= 0)) {
      throw new Error(`CSV 第 ${rowNumber} 行重复序号必须是正整数。`);
    }
    const referenceJoint = values[4] === "" ? null : values[4] as JointName;
    if (referenceJoint !== null && !(referenceJoint in JOINT_DEFINITIONS)) {
      throw new Error(`CSV 第 ${rowNumber} 行包含未知关节。`);
    }
    const manualReferenceAngleDeg = values[5] === "" ? null : Number(values[5]);
    if (manualReferenceAngleDeg !== null && (!Number.isFinite(manualReferenceAngleDeg)
      || manualReferenceAngleDeg < 0 || manualReferenceAngleDeg > 180)) {
      throw new Error(`CSV 第 ${rowNumber} 行人工角度必须在 0–180 度之间。`);
    }
    if (manualReferenceAngleDeg !== null && referenceJoint === null) {
      throw new Error(`CSV 第 ${rowNumber} 行人工角度缺少对应关节。`);
    }
    return {
      id: `imported-${rowNumber}`,
      timestampMs,
      eventLabel,
      repeatIndex,
      phaseLabel: restoredCsvText(values[3]),
      referenceJoint,
      manualReferenceAngleDeg,
      modelReferenceAngleDeg: null,
      note: restoredCsvText(values[8]),
    };
  }).sort((left, right) => left.timestampMs - right.timestampMs);
}

export function poseManualAnnotationsCsv(annotations: ManualPoseAnnotation[]) {
  const rows = [...annotations].sort((left, right) => left.timestampMs - right.timestampMs).map((annotation) => [
    annotation.timestampMs.toFixed(1), annotation.eventLabel, annotation.repeatIndex,
    annotation.phaseLabel, annotation.referenceJoint, annotation.manualReferenceAngleDeg?.toFixed(1) ?? null,
    annotation.modelReferenceAngleDeg?.toFixed(1) ?? null,
    absoluteAngleDifference(annotation.manualReferenceAngleDeg, annotation.modelReferenceAngleDeg)?.toFixed(1) ?? null,
    annotation.note,
  ].map(safeCsvCell).join(","));
  return [MANUAL_ANNOTATION_CSV_HEADER.join(","), ...rows].join("\n");
}
