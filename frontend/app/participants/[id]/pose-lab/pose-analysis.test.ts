import { describe, expect, it } from "vitest";
import { angleDegrees, createPoseFrame, poseAnalysisCsv, summarizePose, type PosePoint } from "./pose-analysis";

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
    expect(summary.jointRanges.left_knee).toEqual({ minimum: 90, maximum: 180, range: 90 });
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
});
