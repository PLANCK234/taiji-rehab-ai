import { expect, it } from "vitest";
import { createPoseFrame } from "./pose-analysis";
import { sitToStandCandidates } from "./sit-to-stand";

function leftFrames(angles: (number | null)[]) {
  return angles.map((angle, index) => {
    const frame = createPoseFrame(index * 100);
    frame.detected = true;
    frame.angles.left_hip = angle;
    frame.angles.left_knee = angle;
    return frame;
  });
}

it("chooses the side with paired hip and knee angles and counts each transition", () => {
  const frames = leftFrames([90, 90, 170, 170, 90, 90, 170, 170]);
  for (const frame of frames) frame.angles.right_hip = frame.angles.left_hip;
  expect(sitToStandCandidates(frames)).toEqual({
    side: "left", pairedSamples: 8, timestampsMs: [200, 600],
  });
});

it("requires two contiguous confirmation frames and clears state after a gap", () => {
  const frames = leftFrames([90, 90, 170, 170, 90, 90, 170, 170]);
  frames[2].angles.left_knee = null;
  frames[3].timestampMs += 60;
  expect(sitToStandCandidates(frames).timestampsMs).toEqual([600]);
});

it("distinguishes unavailable signal from a measured series without a candidate", () => {
  expect(sitToStandCandidates(leftFrames([90, 90, 90, 90])).timestampsMs).toBeNull();
  expect(sitToStandCandidates(leftFrames([170, 170, 90, 90])).timestampsMs).toEqual([]);
});
