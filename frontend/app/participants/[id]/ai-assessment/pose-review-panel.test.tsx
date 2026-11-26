// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { writeDemo } from "../../../workspace/demo";
import { jointNames } from "../../../workspace/pose";
import type { PoseDetail, PoseReview } from "../../../workspace/pose";
import PoseReviewPanel from "./pose-review-panel";

vi.mock("../../../workspace/demo", async importOriginal => ({
  ...await importOriginal<typeof import("../../../workspace/demo")>(), writeDemo: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function report(): PoseDetail {
  const metric = { median_deg: 90, range_p05_p95_deg: 4, coverage: 1, valid_frames: 3,
    observed_seconds: .4, reason: null };
  const review: PoseReview = { id: "review", revision_no: 1, decision: "modified_observations",
    reason: "逐项核对", recorded_by: "reviewer", recorded_at: "2026-11-26T00:00:00Z",
    corrections: [{ joint: "left_elbow", metric: "median_deg", validity: "valid", value: 0, reason: "人工测量" }] };
  return { id: "analysis", participant_id: "participant", algorithm_version: "pose-geometry-v2",
    input_sha256: "hash", created_at: "2026-11-26T00:00:00Z", reviews: [review],
    input_data: { source: "synthetic_video", model_version: "mediapipe-pose-lite-float16-v1",
      model_sha256: "hash", width: 640, height: 480, support: "seated", frames: [] },
    result: { status: "measured", sampled_frames: 3, single_pose_frames: 3, multiple_pose_frames: 0,
      duration_seconds: .4, metrics: Object.fromEntries(Object.keys(jointNames).map(j => [j, metric])) },
    human_confirmation: { evidence_type: "HUMAN_CONFIRMATION", review_id: "review", revision_no: 1,
      decision: "modified_observations", metrics: { left_elbow: { median_deg: 0, range_p05_p95_deg: 4 } } },
  };
}

it("readers see independent human values and history without edit controls", () => {
  render(<PoseReviewPanel report={report()} canReview={false} busy={false}
    onBusy={vi.fn()} onStatus={vi.fn()} onReload={vi.fn()} />);
  expect(screen.getByText(/人工复核 0°/)).toBeTruthy();
  expect(screen.getByText(/版本1 · 修正后确认观察指标/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "保存人工复核" })).toBeNull();
});

it("restores a zero correction and retries the unchanged review with the same key", async () => {
  const data = report(), onReload = vi.fn().mockResolvedValue(undefined), onStatus = vi.fn();
  vi.mocked(writeDemo).mockResolvedValueOnce({ status: 503, value: null })
    .mockResolvedValueOnce({ status: 201, value: data.reviews[0] });
  render(<PoseReviewPanel report={data} canReview busy={false}
    onBusy={vi.fn()} onStatus={onStatus} onReload={onReload} />);
  expect((screen.getByLabelText("修正1人工值（度）") as HTMLInputElement).value).toBe("0");
  fireEvent.change(screen.getByLabelText("复核说明"), { target: { value: "再次核对零值" } });
  fireEvent.click(screen.getByRole("button", { name: "保存人工复核" }));
  await waitFor(() => expect(onStatus).toHaveBeenCalledWith(expect.stringContaining("服务暂不可用")));
  fireEvent.click(screen.getByRole("button", { name: "保存人工复核" }));
  await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
  const calls = vi.mocked(writeDemo).mock.calls;
  expect(calls[0][3]).toBe(calls[1][3]);
  expect(calls[0][1]).toEqual(calls[1][1]);
  expect(calls[0][1]).toMatchObject({ corrections: [{ value: 0 }] });
});
