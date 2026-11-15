import { describe, expect, it } from "vitest";
import {
  absoluteAngleDifference, angleDegrees, createPoseFrame, nearestPoseFrame, poseAnalysisCsv, poseAnnotationTemplateCsv,
  poseManualAnnotationsCsv, summarizePose, type PosePoint,
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

  it("keeps manual and model angles separate and only compares two known values", () => {
    expect(absoluteAngleDifference(95, 91.25)).toBe(3.75);
    expect(absoluteAngleDifference(null, 91.25)).toBeNull();
    expect(absoluteAngleDifference(95, null)).toBeNull();
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
});
