// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PoseDetail } from "../../../../lib/pose";
import { readTiming, writeTiming } from "../../../../lib/sppb";
import type { TimingDetail, TimingPage } from "../../../../lib/sppb";
import SppbPanel from "./sppb-panel";

vi.mock("../../../../lib/sppb", async original => ({
  ...await original<typeof import("../../../../lib/sppb")>(), readTiming: vi.fn(), writeTiming: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const source: PoseDetail = { id: "pose-1", participant_id: "person-1", algorithm_version: "pose-geometry-v3",
  input_sha256: "hash", created_at: "2026-11-26T00:00:00Z", reviews: [], human_confirmation: null,
  input_data: { source: "synthetic_video", model_version: "mediapipe-pose-lite-float16-v1", model_sha256: "hash",
    width: 640, height: 480, support: "unknown", frames: [] },
  result: { status: "measured", sampled_frames: 60, single_pose_frames: 60, multiple_pose_frames: 0, duration_seconds: 12, metrics: {} } };
function detail(): TimingDetail {
  return { id: "timing-1", source_analysis_id: source.id, algorithm_version: "sppb-measure-v1",
    created_by: "actor", created_at: source.created_at, result: { status: "candidate", elapsed_seconds: 10.6,
      start_ms: 0, fifth_stand_ms: 10600, candidate_count: 5, stand_timestamps_ms: [1000, 3400, 5800, 8200, 10600],
      failure_reasons: [], input_sha256: "hash", quality: { usable_frame_ratio: 1, single_person_frame_ratio: 1, mean_keypoint_visibility: 1 } },
    reviews: [], human_confirmation: null };
}
function page(row = detail()): TimingPage { return { items: [row], total: 1, offset: 0, limit: 5 }; }
function mount(props: Partial<Parameters<typeof SppbPanel>[0]> = {}) {
  render(<SppbPanel participantId="person-1" source={source} initialPage={page()} canWrite canReview busy={false}
    onBusy={vi.fn()} onOpenSource={vi.fn()} {...props} />);
}

it("keeps failed history unknown and offers a refresh without creating synthetic rows", () => {
  mount({ initialPage: null, source: null });
  expect(screen.getByRole("alert").textContent).toContain("历史读取失败");
  expect(screen.queryByRole("button", { name: "生成坐站候选测量" })).toBeNull();
  expect(screen.getByRole("button", { name: "刷新坐站历史" })).toBeTruthy();
});

it("read-only users see AI and human timing separately and cannot edit", async () => {
  const row = detail();
  row.human_confirmation = { evidence_type: "HUMAN_CONFIRMATION", review_id: "review", revision_no: 1,
    start_ms: 0, fifth_stand_ms: 10000, elapsed_seconds: 10, recorded_by: "human", recorded_at: source.created_at };
  vi.mocked(readTiming).mockResolvedValue(row);
  mount({ canWrite: false, canReview: false });
  fireEvent.click(screen.getByRole("button", { name: "打开坐站测量" }));
  const region = await screen.findByRole("region", { name: "当前坐站测量" });
  expect(within(region).getByText("10.6 秒")).toBeTruthy();
  expect(within(region).getByText("10 秒")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "保存坐站人工复核" })).toBeNull();
});

it("preserves manual zero and retries an unchanged creation with the same key", async () => {
  const row = detail();
  vi.mocked(writeTiming).mockResolvedValueOnce({ status: 503, value: null }).mockResolvedValueOnce({ status: 201, value: row });
  vi.mocked(readTiming).mockImplementation(async path => path.includes("/sppb-measurements?") ? page() : row);
  mount();
  fireEvent.click(screen.getByLabelText("指定人工起点"));
  fireEvent.change(screen.getByLabelText("人工起点（秒）"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "生成坐站候选测量" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("提交结果暂无法确认"));
  expect((screen.getByLabelText("人工起点（秒）") as HTMLInputElement).value).toBe("0");
  fireEvent.click(screen.getByRole("button", { name: "生成坐站候选测量" }));
  await screen.findByRole("region", { name: "当前坐站测量" });
  const calls = vi.mocked(writeTiming).mock.calls;
  expect(calls[0][2]).toBe(calls[1][2]);
  expect(calls[0][1]).toEqual({ source_analysis_id: source.id, manual_start_ms: 0 });
});

it("preserves corrected zero and the reason on revision conflict and requires explicit refresh", async () => {
  const row = detail();
  row.reviews = [{ id: "r1", revision_no: 1, decision: "modified_timing", start_ms: 0,
    fifth_stand_ms: 10000, reason: "原复核", recorded_by: "human", recorded_at: source.created_at }];
  vi.mocked(readTiming).mockResolvedValue(row);
  vi.mocked(writeTiming).mockResolvedValue({ status: 409, value: null });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "打开坐站测量" }));
  const reason = await screen.findByLabelText("坐站复核说明");
  expect((screen.getByLabelText("修正起点（秒）") as HTMLInputElement).value).toBe("0");
  fireEvent.change(reason, { target: { value: "再次核对起止" } });
  fireEvent.click(screen.getByRole("button", { name: "保存坐站人工复核" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("记录版本已变化"));
  expect((reason as HTMLTextAreaElement).value).toBe("再次核对起止");
  expect(vi.mocked(writeTiming).mock.calls[0][1]).toMatchObject({ expected_revision: 1, start_ms: 0 });
});

it("unknown candidates show their reason and disable direct acceptance", async () => {
  const row = detail(); row.result.elapsed_seconds = null; row.result.status = "not_assessable";
  row.result.failure_reasons = ["hand_support_suspected"];
  vi.mocked(readTiming).mockResolvedValue(row);
  mount();
  fireEvent.click(screen.getByRole("button", { name: "打开坐站测量" }));
  expect(await screen.findByText("疑似用手撑扶，请人工核对")).toBeTruthy();
  expect((screen.getByRole("option", { name: "确认AI候选计时" }) as HTMLOptionElement).disabled).toBe(true);
  expect((screen.getByLabelText("坐站复核结论") as HTMLSelectElement).value).toBe("needs_retake");
});

it("failed refresh keeps the existing history and count visible", async () => {
  vi.mocked(readTiming).mockResolvedValue(null);
  mount();
  fireEvent.click(screen.getByRole("button", { name: "刷新坐站历史" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("坐站历史读取失败"));
  expect(screen.getByRole("button", { name: "打开坐站测量" })).toBeTruthy();
  expect(screen.getByText(/共 1 条/)).toBeTruthy();
});
