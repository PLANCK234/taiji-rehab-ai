import { describe, expect, it } from "vitest";
import {
  absoluteAngleDifference, angleDegrees, createPoseFrame, jointAngleSegments, nearestPoseFrame, poseAnalysisCsv, poseAnnotationTemplateCsv,
  parsePoseManualAnnotationsCsv, poseComparisonSummaryJson, poseManualAnnotationsCsv, summarizeManualAngleComparisons, summarizePose,
  timelinePositionRatio, type ManualPoseAnnotation, type PosePoint,
} from "./pose-analysis";

const visible = (x: number, y: number, z = 0): PosePoint => ({ x, y, z, visibility: 1, presence: 1 });

describe("pose prototype kinematics", () => {
  it("computes a three-dimensional joint angle and rejects unavailable points", () => {
    expect(angleDegrees(visible(1, 0), visible(0, 0), visible(0, 1))).toBe(90);
    expect(angleDegrees(visible(1, 0), { ...visible(0, 0), visibility: 0.2 }, visible(0, 1))).toBeNull();
  });

  it("keeps failed detections unknown and summarizes observed ranges", () => {
    const normalized = Array.from({ length: 33 }, () => visible(0.5, 0.5));
    const firstWorld = Array.from({ length: 33 }, () => visible(0, 0));
    firstWorld[23] = visible(0, 1); firstWorld[25] = visible(0, 0); firstWorld[27] = visible(1, 0);
    const secondWorld = firstWorld.map((point) => ({ ...point }));
    secondWorld[27] = visible(0, -1);
    const frames = [createPoseFrame(0), createPoseFrame(100, normalized, firstWorld), createPoseFrame(200, normalized, secondWorld)];
    const summary = summarizePose(frames, 300, 10);
    expect(frames[0].detected).toBe(false);
    expect(frames[0].angles.left_knee).toBeNull();
    expect(summary.detectedFrames).toBe(2);
    expect(summary.detectionRate).toBeCloseTo(2 / 3);
    expect(summary.observedDurationMs).toBe(100);
    expect(summary.longestConsecutiveMissedSamples).toBe(1);
    expect(summary.landmarkCoverage.left_knee).toBeCloseTo(2 / 3);
    expect(summary.jointAngleCoverage.left_knee).toBeCloseTo(2 / 3);
    expect(summary.jointRanges.left_knee).toEqual({ minimum: 90, maximum: 180, range: 90 });
  });

  it("reports low-confidence landmarks and consecutive misses without a pass/fail label", () => {
    const normalized = Array.from({ length: 33 }, () => visible(0.5, 0.5));
    normalized[27] = { ...normalized[27], visibility: 0.2 };
    const world = Array.from({ length: 33 }, () => visible(0, 0));
    const frames = [createPoseFrame(0, normalized, world), createPoseFrame(100), createPoseFrame(200)];
    const summary = summarizePose(frames, 300, 10);
    expect(summary.landmarkCoverage.left_ankle).toBe(0);
    expect(summary.landmarkCoverage.right_ankle).toBeCloseTo(1 / 3);
    expect(summary.longestConsecutiveMissedSamples).toBe(2);
    expect(JSON.stringify(summary)).not.toMatch(/pass|fail|合格|不合格/i);
  });

  it("exports derived angles and trajectories without video pixels", () => {
    const normalized = Array.from({ length: 33 }, () => visible(0.5, 0.5));
    const world = Array.from({ length: 33 }, () => visible(0, 0));
    const csv = poseAnalysisCsv([createPoseFrame(250, normalized, world)]);
    expect(csv).toContain("timestamp_ms,detected,left_shoulder_angle_deg");
    expect(csv).toContain("pelvis_x_normalized");
    expect(csv).toContain("250.0,1");
    expect(csv).not.toContain("video");
  });

  it("creates a blank human-annotation template aligned to sample timestamps", () => {
    const template = poseAnnotationTemplateCsv([createPoseFrame(0), createPoseFrame(100)]);
    expect(template).toContain("manual_event_label,manual_repeat_index,manual_phase_label");
    const rows = template.split("\n");
    expect(rows[0]).toContain("manual_reference_angle_deg,model_reference_angle_deg,absolute_angle_difference_deg");
    expect(rows.slice(1).map((row) => row.split(",").length)).toEqual([10, 10]);
    expect(template).not.toContain("filename");
  });

  it("finds the closest model frame for a manual timestamp", () => {
    const frames = [createPoseFrame(0), createPoseFrame(100), createPoseFrame(200)];
    expect(nearestPoseFrame(frames, 149)?.timestampMs).toBe(100);
    expect(nearestPoseFrame(frames, 151)?.timestampMs).toBe(200);
    expect(nearestPoseFrame([], 100)).toBeUndefined();
  });

  it("splits joint angle time series at unknown samples instead of bridging gaps", () => {
    const frame = (timestampMs: number, angle: number | null) => {
      const value = createPoseFrame(timestampMs);
      value.angles.right_knee = angle;
      return value;
    };
    expect(jointAngleSegments([
      frame(0, 90), frame(100, 120), frame(200, null), frame(300, null), frame(400, 150),
    ], "right_knee")).toEqual([
      [{ timestampMs: 0, angleDeg: 90 }, { timestampMs: 100, angleDeg: 120 }],
      [{ timestampMs: 400, angleDeg: 150 }],
    ]);
  });

  it("keeps the timeline cursor within the available video duration", () => {
    expect(timelinePositionRatio(500, 2000)).toBe(0.25);
    expect(timelinePositionRatio(-100, 2000)).toBe(0);
    expect(timelinePositionRatio(2500, 2000)).toBe(1);
    expect(timelinePositionRatio(100, 0)).toBe(0);
  });

  it("keeps manual and model angles separate and only compares two known values", () => {
    expect(absoluteAngleDifference(95, 91.25)).toBe(3.75);
    expect(absoluteAngleDifference(null, 91.25)).toBeNull();
    expect(absoluteAngleDifference(95, null)).toBeNull();
  });

  it("summarizes comparable angles without turning missing values into zero", () => {
    const annotation = (id: string, joint: ManualPoseAnnotation["referenceJoint"], manual: number | null,
      model: number | null): ManualPoseAnnotation => ({
      id, timestampMs: Number(id) * 100, eventLabel: `event-${id}`, repeatIndex: null, phaseLabel: "",
      referenceJoint: joint, manualReferenceAngleDeg: manual, modelReferenceAngleDeg: model, note: "private note",
    });
    const annotations = [
      annotation("1", "left_knee", 90, 92), annotation("2", "left_knee", 100, 96),
      annotation("3", "left_elbow", 80, null), annotation("4", "right_elbow", null, 70),
    ];
    const summary = summarizeManualAngleComparisons(annotations);
    expect(summary.totalAnnotations).toBe(4);
    expect(summary.missingManualAngleAnnotations).toBe(1);
    expect(summary.missingModelAngleAnnotations).toBe(1);
    expect(summary.overall).toEqual({
      count: 2, meanAbsoluteDifferenceDeg: 3, medianAbsoluteDifferenceDeg: 3, maximumAbsoluteDifferenceDeg: 4,
    });
    expect(summary.byJoint.left_knee).toEqual(summary.overall);
    expect(summary.byJoint.left_elbow).toBeUndefined();
    const exported = poseComparisonSummaryJson(annotations);
    expect(exported).toContain('"schema_version": "pose-comparison-summary-v1"');
    expect(exported).not.toContain("private note");
    expect(exported).not.toContain("event-1");
    expect(exported).not.toMatch(/pass|fail|合格|不合格/i);
  });

  it("exports sorted manual annotations and protects spreadsheet cells", () => {
    const csv = poseManualAnnotationsCsv([{
      id: "later", timestampMs: 900, eventLabel: "=unsafe", repeatIndex: 2, phaseLabel: "自定义,阶段",
      referenceJoint: "left_knee", manualReferenceAngleDeg: 93.5, modelReferenceAngleDeg: 91.24,
      note: "第一行\n第二行",
    }, {
      id: "earlier", timestampMs: 100, eventLabel: "人工事件", repeatIndex: null, phaseLabel: "",
      referenceJoint: null, manualReferenceAngleDeg: null, modelReferenceAngleDeg: null, note: "",
    }]);
    const rows = csv.split("\n");
    expect(rows[1]).toBe("100.0,人工事件,,,,,,,");
    expect(rows[2]).toContain("900.0,'=unsafe,2,\"自定义,阶段\",left_knee,93.5,91.2,2.3");
    expect(csv).toContain("\"第一行\n第二行\"");
  });

  it("imports its annotation CSV while discarding stale model-derived values", () => {
    const csv = poseManualAnnotationsCsv([{
      id: "source", timestampMs: 900, eventLabel: "=人工事件", repeatIndex: 2, phaseLabel: "自定义,阶段",
      referenceJoint: "left_knee", manualReferenceAngleDeg: 93.5, modelReferenceAngleDeg: 91.2,
      note: "第一行\n第二行",
    }]);
    expect(parsePoseManualAnnotationsCsv(csv, 1000)).toEqual([{
      id: "imported-2", timestampMs: 900, eventLabel: "=人工事件", repeatIndex: 2, phaseLabel: "自定义,阶段",
      referenceJoint: "left_knee", manualReferenceAngleDeg: 93.5, modelReferenceAngleDeg: null,
      note: "第一行\n第二行",
    }]);
  });

  it("rejects imported annotations outside the current video or with unknown joints", () => {
    const header = poseManualAnnotationsCsv([]);
    expect(() => parsePoseManualAnnotationsCsv(`${header}\n1100,事件,,,,,,,`, 1000)).toThrow("时间超出当前视频范围");
    expect(() => parsePoseManualAnnotationsCsv(`${header}\n500,事件,,,unknown_joint,,,,`, 1000)).toThrow("包含未知关节");
  });
});
