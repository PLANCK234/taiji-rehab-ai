// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PoseDetail } from "../../../workspace/pose";
import MotionEvidence from "./motion-evidence";

afterEach(cleanup);

function oldReport(): PoseDetail {
  const metric = { median_deg: 90, range_p05_p95_deg: 0, valid_frames: 3, coverage: 1,
    observed_seconds: .4, reason: null };
  return {
    id: "test", participant_id: "test", algorithm_version: "pose-geometry-v1", input_sha256: "old",
    created_at: "2026-11-26T00:00:00Z", reviews: [], human_confirmation: null,
    input_data: { source: "synthetic_video", model_version: "mediapipe-pose-lite-float16-v1",
      model_sha256: "old", width: 640, height: 480, support: "seated",
      frames: [0, 200, 400].map(timestamp_ms => ({ timestamp_ms, landmarks: [], pose_count: 0 })) },
    result: { status: "measured", sampled_frames: 3, single_pose_frames: 3, multiple_pose_frames: 0,
      duration_seconds: .4, metrics: { left_elbow: metric },
      series: [0, 200, 400].map(timestamp_ms => ({ timestamp_ms, angles: { left_elbow: 90 } })) },
  };
}

it("reads legacy reports without inventing zero noise", () => {
  render(<MotionEvidence report={oldReport()} cursor={0} onCursorChange={vi.fn()} />);
  expect(screen.getByText("旧版报告保留原值，未重算噪声。")).toBeTruthy();
  expect(screen.getByText(/数据不足\/旧版未计算/)).toBeTruthy();
});

it("shows quality separately and links curve time to evidence frames", () => {
  const report = oldReport(), onCursorChange = vi.fn();
  Object.assign(report.result.metrics.left_elbow, {
    smoothed_range_p05_p95_deg: 0, noise_sigma_deg: .4, variation_status: "within_residual_noise",
  });
  render(<MotionEvidence report={report} cursor={0} onCursorChange={onCursorChange} />);
  expect(screen.getByText("变化未超过估计残差")).toBeTruthy();
  expect(screen.getByText(/0.4°/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("角度曲线时间"), { target: { value: "2" } });
  expect(onCursorChange).toHaveBeenCalledWith(2);
});
