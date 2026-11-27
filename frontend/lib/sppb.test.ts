import { expect, it } from "vitest";
import { parseTimingSeconds, timingReviewBody } from "./sppb";
import type { TimingDetail } from "./sppb";

it("preserves a genuine zero start while rejecting blank and invalid timestamps", () => {
  expect(parseTimingSeconds("0", 10)).toBe(0);
  expect(parseTimingSeconds("1.001", 10)).toBe(1001);
  for (const value of ["", " ", "NaN", "Infinity", "-1", "11"]) {
    expect(() => parseTimingSeconds(value, 10)).toThrow();
  }
});

it("requires complete ordered corrections and a reason; non-corrections carry no timestamps", () => {
  const detail = { reviews: [{ revision_no: 3 }] } as TimingDetail;
  expect(timingReviewBody(detail, "modified_timing", " 核对起止 ", "0", "10", 12)).toEqual({
    expected_revision: 3, decision: "modified_timing", reason: "核对起止", start_ms: 0, fifth_stand_ms: 10000,
  });
  for (const [start, end] of [["", "10"], ["10", "10"], ["11", "10"], ["1.0001", "1.0002"]]) {
    expect(() => timingReviewBody(detail, "modified_timing", "核对", start, end, 12)).toThrow();
  }
  expect(() => timingReviewBody(detail, "needs_retake", " ", "", "", 12)).toThrow();
  expect(timingReviewBody(detail, "needs_retake", "重测", "", "", 12).start_ms).toBeNull();
});
