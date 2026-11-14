import { describe, expect, it } from "vitest";
import {
  angleDegrees, createPoseFrame, poseAnalysisCsv, poseAnnotationTemplateCsv, summarizePose, type PosePoint,
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
    expect(template.split("\n")).toEqual([
      expect.stringContaining("reviewer_note"), "0.0,0,,,,,,", "100.0,0,,,,,,",
    ]);
    expect(template).not.toContain("filename");
  });
});
