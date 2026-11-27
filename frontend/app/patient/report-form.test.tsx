// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PatientReportForm from "./report-form";
import type { PatientReport } from "../../lib/patient-reports";
import { postIntake } from "../../lib/intake";

vi.mock("../../lib/intake", () => ({ postIntake: vi.fn() }));
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));
afterEach(() => {
  cleanup();
  vi.mocked(postIntake).mockReset();
  navigation.refresh.mockClear();
  vi.useRealTimers();
});

const first: PatientReport = {
  publication_version: null,
  pose_summary: null,
  id: "revision-1", report_id: "report-1", participant_id: "synthetic-participant",
  revision_no: 1, observed_at: "2026-11-05T02:00:00Z",
  activity_state: "unknown", actual_minutes: null,
  discomfort_state: "unknown", discomfort_note: null,
  change_reason: null, recorded_by: "synthetic-patient",
  recorded_at: "2026-11-05T02:05:00Z",
};

function fillTime() {
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-25T10:00" } });
}

it("keeps the unsaved draft if rechecking history temporarily fails", () => {
  const view = render(<PatientReportForm initialReports={[]} />); fillTime();
  view.rerender(<PatientReportForm initialReports={null} />);
  expect(screen.queryByRole("heading", { name: "新增本人记录" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新检查记录" }));
  view.rerender(<PatientReportForm initialReports={[]} />);
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  expect(postIntake).not.toHaveBeenCalled();
});

it("shows inline errors, focuses the first invalid field and accepts explicit zero minutes", async () => {
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: first });
  render(<PatientReportForm initialReports={[]} />);
  fireEvent.change(screen.getByLabelText("实际训练情况"), { target: { value: "performed" } });
  fireEvent.change(screen.getByLabelText(/实际时长/), { target: { value: "-1" } });
  fireEvent.change(screen.getByLabelText("不适情况"), { target: { value: "reported" } });
  fireEvent.change(screen.getByLabelText("不适描述"), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  expect(postIntake).not.toHaveBeenCalled();
  expect(screen.getByLabelText("发生时间（北京时间）")).toBe(document.activeElement);
  expect(screen.getByLabelText(/实际时长/).getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByLabelText("不适描述").getAttribute("aria-invalid")).toBe("true");
  fillTime();
  fireEvent.change(screen.getByLabelText(/实际时长/), { target: { value: "0" } });
  fireEvent.change(screen.getByLabelText("不适描述"), { target: { value: "SYN-描述" } });
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByText("当前版本 1");
  expect(vi.mocked(postIntake).mock.calls[0][1]).toMatchObject({ actual_minutes: 0, discomfort_note: "SYN-描述" });
});

it("retains a failed draft and reuses its body and idempotency key for retry", async () => {
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 503, value: null }).mockResolvedValueOnce({ status: 201, value: first });
  render(<PatientReportForm initialReports={[]} />); fillTime();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "重试保存" });
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  expect(screen.queryByText(/合成记录已保存/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重试保存" }));
  await screen.findByText("当前版本 1");
  const calls = vi.mocked(postIntake).mock.calls;
  expect(calls).toHaveLength(2); expect(calls[1].slice(0, 3)).toEqual(calls[0].slice(0, 3));
  expect(screen.getAllByText("当前版本 1")).toHaveLength(1);
});

it("locks the form and synchronously suppresses duplicate submissions while pending", async () => {
  let resolve!: (result: { status: number; value: null }) => void;
  vi.mocked(postIntake).mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<PatientReportForm initialReports={[first]} />); fillTime();
  const form = screen.getByRole("button", { name: "保存记录" }).closest("form")!;
  fireEvent.submit(form); fireEvent.submit(form);
  expect(postIntake).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "正在保存…" }).getAttribute("disabled")).not.toBeNull();
  expect(screen.getByLabelText("发生时间（北京时间）").closest("fieldset")?.disabled).toBe(true);
  expect(screen.getByRole("button", { name: "更正" }).getAttribute("disabled")).not.toBeNull();
  await act(async () => { resolve({ status: 503, value: null }); });
  expect(screen.getByLabelText("发生时间（北京时间）").closest("fieldset")?.disabled).toBe(false);
});

it.each([[401, "登录已失效"], [403, "没有保存权限"], [422, "未通过检查"], [429, "提交过于频繁"]])("explains status %s and preserves the draft", async (status, text) => {
  vi.mocked(postIntake).mockResolvedValue({ status, value: null });
  render(<PatientReportForm initialReports={[]} />); fillTime();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(text));
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  expect(screen.getByRole("button", { name: "重试保存" })).toBeTruthy();
});

it("requires explicit confirmation to use a refreshed revision after conflict, retaining corrections", async () => {
  const second = { ...first, id: "revision-2", revision_no: 2 };
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 409, value: null }).mockResolvedValueOnce({ status: 201, value: { ...second, id: "revision-3", revision_no: 3 } });
  const view = render(<PatientReportForm initialReports={[first]} />);
  fireEvent.click(screen.getByRole("button", { name: "更正" }));
  fireEvent.change(screen.getByLabelText(/更正原因/), { target: { value: "SYN-核对" } });
  fireEvent.click(screen.getByRole("button", { name: "保存更正" }));
  await screen.findByRole("button", { name: "重新检查记录" });
  expect(screen.getByRole("button", { name: "保存更正" }).getAttribute("disabled")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新检查记录" }));
  view.rerender(<PatientReportForm initialReports={[first, second]} />);
  expect(postIntake).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "使用最新版本继续更正" }));
  expect((screen.getByLabelText(/更正原因/) as HTMLInputElement).value).toBe("SYN-核对");
  fireEvent.click(screen.getByRole("button", { name: "保存更正" }));
  await screen.findByText("当前版本 3");
  expect(vi.mocked(postIntake).mock.calls[1][1]).toMatchObject({ expected_revision: 2, change_reason: "SYN-核对" });
});

it("treats unexpected exceptions as a retryable failure and changes the key after an edit", async () => {
  vi.mocked(postIntake).mockRejectedValueOnce(new Error("SYN-network")).mockResolvedValueOnce({ status: 201, value: first });
  render(<PatientReportForm initialReports={[]} />); fillTime();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "重试保存" });
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-25T11:00" } });
  fireEvent.click(screen.getByRole("button", { name: "重试保存" }));
  await screen.findByText("当前版本 1");
  const calls = vi.mocked(postIntake).mock.calls;
  expect(calls[0][2]).not.toBe(calls[1][2]);
});

it("requires checking history before starting a fresh submission after a new-report conflict", async () => {
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 409, value: null }).mockResolvedValueOnce({ status: 201, value: first });
  render(<PatientReportForm initialReports={[]} />); fillTime();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "已核对历史，继续填写" });
  expect(screen.getByRole("button", { name: "保存记录" }).getAttribute("disabled")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "已核对历史，继续填写" }));
  expect(postIntake).toHaveBeenCalledOnce();
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByText("当前版本 1");
  expect(vi.mocked(postIntake).mock.calls[0][2]).not.toBe(vi.mocked(postIntake).mock.calls[1][2]);
});

it("times out a stalled request without losing the draft or retrying automatically", async () => {
  vi.useFakeTimers();
  vi.mocked(postIntake).mockImplementation((_path, _body, _key, _cookies, _fetcher, signal) => new Promise((resolve) => {
    signal!.addEventListener("abort", () => resolve({ status: 503, value: null }));
  }));
  render(<PatientReportForm initialReports={[]} />); fillTime();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(screen.getByRole("button", { name: "重试保存" })).toBeTruthy();
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  expect(postIntake).toHaveBeenCalledOnce();
});

it("offers a read-only recheck when reports are unavailable", () => {
  render(<PatientReportForm initialReports={null} />);
  expect(screen.getByText("训练与不适记录暂时无法读取。")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "新增本人记录" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新检查记录" }));
  expect(navigation.refresh).toHaveBeenCalledOnce();
});

it("uses the refreshed server result to recover from a report read failure", () => {
  const view = render(<PatientReportForm initialReports={null} />);
  fireEvent.click(screen.getByRole("button", { name: "重新检查记录" }));
  view.rerender(<PatientReportForm initialReports={[]} />);
  expect(screen.queryByRole("button", { name: "重新检查记录" })).toBeNull();
  expect(screen.getByText(/尚未填写训练或不适记录/)).toBeTruthy();
  expect(screen.getByRole("heading", { name: "新增本人记录" })).toBeTruthy();
  view.rerender(<PatientReportForm initialReports={null} />);
  expect(screen.queryByRole("heading", { name: "新增本人记录" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新检查记录" }));
  view.rerender(<PatientReportForm initialReports={[first]} />);
  expect(screen.getByText("当前版本 1")).toBeTruthy();
  expect(screen.queryByText(/暂时无法读取/)).toBeNull();
  expect(postIntake).not.toHaveBeenCalled();
});

it("merges refreshed revisions with a save response while preserving the draft", async () => {
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: first });
  const view = render(<PatientReportForm initialReports={[]} />);
  const field = screen.getByLabelText<HTMLInputElement>("发生时间（北京时间）");
  fireEvent.change(field, { target: { value: "2026-11-05T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByText("当前版本 1");
  fireEvent.change(field, { target: { value: "2026-11-05T11:00" } });
  view.rerender(<PatientReportForm initialReports={[first]} />);
  expect(screen.getAllByText("当前版本 1")).toHaveLength(1);
  expect(field.value).toBe("2026-11-05T11:00");
  const updated = { ...first, id: "revision-2", revision_no: 2 };
  view.rerender(<PatientReportForm initialReports={[first, updated]} />);
  expect(screen.getByText("当前版本 2")).toBeTruthy();
  expect(screen.getAllByText("旧版本 1")).toHaveLength(1);
  expect(field.value).toBe("2026-11-05T11:00");
});

it("shows full current and previous synthetic facts in revision order", () => {
  const second: PatientReport = {
    ...first, id: "revision-2", revision_no: 2,
    observed_at: "2026-11-05T03:00:00Z", activity_state: "performed",
    actual_minutes: 12, discomfort_state: "reported",
    discomfort_note: "合成不适描述", change_reason: "SYN-补录",
    recorded_at: "2026-11-05T03:05:00Z",
  };
  const third: PatientReport = {
    ...second, id: "revision-3", revision_no: 3,
    observed_at: "2026-11-05T04:00:00Z", actual_minutes: 0,
    discomfort_state: "none", discomfort_note: null,
    change_reason: "SYN-再次更正", recorded_at: "2026-11-05T04:05:00Z",
  };
  render(<PatientReportForm initialReports={[first, third, second]} />);

  const current = screen.getByText("当前版本 3").closest("p")?.textContent ?? "";
  expect(current).toContain("12:00");
  expect(current).toContain("0 分钟");
  expect(current).toContain("自报没有不适");
  expect(current).toContain("SYN-再次更正");
  expect(current).toContain("保存时间");

  const history = screen.getByText("查看旧版本").closest("details");
  const revisions = [...(history?.querySelectorAll("li") ?? [])].map((row) => row.textContent ?? "");
  expect(revisions).toHaveLength(2);
  expect(revisions[0]).toContain("旧版本 2");
  expect(revisions[0]).toContain("11:00");
  expect(revisions[0]).toContain("12 分钟");
  expect(revisions[0]).toContain("合成不适描述");
  expect(revisions[0]).toContain("SYN-补录");
  expect(revisions[1]).toContain("旧版本 1");
  expect(revisions[1]).toContain("10:00");
  expect(revisions[1]).toContain("时长未知");
  expect(revisions[1]).toContain("不适情况不清楚");
});

it("keeps Beijing observation time and exact instant when correcting without changing the time", async () => {
  const report = { ...first, observed_at: "2026-11-05T02:00:42Z" };
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: { ...report, revision_no: 2 } });
  render(<PatientReportForm initialReports={[report]} />);
  fireEvent.click(screen.getByRole("button", { name: "更正" }));
  const input = screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement;
  expect(input.value).toBe("2026-11-05T10:00");
  fireEvent.change(screen.getByLabelText("更正原因（以 SYN- 开头）"), { target: { value: "SYN-核对" } });
  fireEvent.click(screen.getByRole("button", { name: "保存更正" }));
  await waitFor(() => expect(postIntake).toHaveBeenCalled());
  expect(vi.mocked(postIntake).mock.calls[0][1]).toMatchObject({ observed_at: report.observed_at });
});

it("submits a newly entered Beijing time as the matching UTC instant", async () => {
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: first });
  render(<PatientReportForm initialReports={[]} />);
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-05T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await waitFor(() => expect(postIntake).toHaveBeenCalled());
  expect(vi.mocked(postIntake).mock.calls[0][1]).toMatchObject({ observed_at: "2026-11-05T02:00:00.000Z" });
});

it("restores the new-report draft after cancelling a correction", async () => {
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: first });
  render(<PatientReportForm initialReports={[first]} />);
  const time = screen.getByLabelText<HTMLInputElement>("发生时间（北京时间）");
  const activity = screen.getByLabelText<HTMLSelectElement>("实际训练情况");
  fireEvent.change(time, { target: { value: "2026-11-06T10:00" } });
  fireEvent.change(activity, { target: { value: "performed" } });
  fireEvent.change(screen.getByLabelText(/实际时长/), { target: { value: "7" } });
  fireEvent.change(screen.getByLabelText("不适情况"), { target: { value: "reported" } });
  fireEvent.change(screen.getByLabelText("不适描述"), { target: { value: "SYN-新增草稿" } });
  fireEvent.click(screen.getByRole("button", { name: "更正" }));
  expect(time.value).toBe("2026-11-05T10:00");
  fireEvent.click(screen.getByRole("button", { name: "取消更正" }));
  expect(time.value).toBe("2026-11-06T10:00");
  expect(activity.value).toBe("performed");
  expect(screen.queryByLabelText(/更正原因/)).toBeNull();
  expect(postIntake).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await waitFor(() => expect(postIntake).toHaveBeenCalledOnce());
  expect(vi.mocked(postIntake).mock.calls[0].slice(0, 2)).toEqual([
    "/patient/reports",
    expect.objectContaining({
      expected_revision: 0, observed_at: "2026-11-06T02:00:00.000Z",
      actual_minutes: 7, discomfort_note: "SYN-新增草稿", change_reason: null,
    }),
  ]);
});

it("returns to a blank new-report form after cancelling with no draft", () => {
  render(<PatientReportForm initialReports={[{ ...first, activity_state: "performed" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "更正" }));
  fireEvent.click(screen.getByRole("button", { name: "取消更正" }));
  expect(screen.getByLabelText<HTMLInputElement>("发生时间（北京时间）").value).toBe("");
  expect(screen.getByLabelText<HTMLSelectElement>("实际训练情况").value).toBe("unknown");
  expect(screen.queryByLabelText(/实际时长/)).toBeNull();
  expect(postIntake).not.toHaveBeenCalled();
});

it("orders multiple current reports by latest save time before and after correction or reload", async () => {
  const a2: PatientReport = {
    ...first, id: "revision-2", revision_no: 2,
    change_reason: "SYN-补录", recorded_at: "2026-11-05T03:05:00Z",
  };
  const b1: PatientReport = {
    ...first, id: "other-1", report_id: "report-2", revision_no: 1,
    recorded_at: "2026-11-05T04:05:00Z", activity_state: "not_performed",
  };
  const a3: PatientReport = {
    ...a2, id: "revision-3", revision_no: 3,
    change_reason: "SYN-再次更正", recorded_at: "2026-11-05T05:05:00Z",
  };
  const shown = (container: HTMLElement) => [...container.querySelectorAll("section > ul > li")]
    .map((row) => row.querySelector("p")?.textContent ?? "");

  const view = render(<PatientReportForm initialReports={[first, b1, a2]} />);
  expect(shown(view.container)[0]).toContain("自报未训练");
  expect(shown(view.container)[1]).toContain("当前版本 2");
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: a3 });
  const olderReport = view.container.querySelectorAll("section > ul > li")[1];
  fireEvent.click(olderReport.querySelector("button")!);
  fireEvent.change(screen.getByLabelText("更正原因（以 SYN- 开头）"), { target: { value: "SYN-再次更正" } });
  fireEvent.click(screen.getByRole("button", { name: "保存更正" }));
  await waitFor(() => expect(shown(view.container)[0]).toContain("当前版本 3"));
  expect(shown(view.container)[1]).toContain("自报未训练");
  view.unmount();

  const reloaded = render(<PatientReportForm initialReports={[a2, first, b1, a3]} />);
  expect(shown(reloaded.container)[0]).toContain("当前版本 3");
  expect(shown(reloaded.container)[1]).toContain("自报未训练");
  expect(reloaded.container.querySelectorAll("section > ul > li")[0].querySelectorAll("details li")).toHaveLength(2);
});

it("retries linked task feedback with exactly the same confirmed summary and key", async () => {
  const summary = { sample_count: 12, detected_count: 8, framing_check_pass_count: 3 };
  const saved = { ...first, publication_version: 4, pose_summary: summary };
  const onSaved = vi.fn();
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 503, value: null }).mockResolvedValueOnce({ status: 201, value: saved });
  render(<PatientReportForm initialReports={[]} publicationVersion={4} poseSummary={summary} onPoseSummarySaved={onSaved} />);
  fillTime();
  fireEvent.click(screen.getByLabelText(/将本次反馈关联/));
  fireEvent.click(screen.getByLabelText(/一并提交本次姿态/));
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "重试保存" });
  expect(onSaved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "重试保存" }));
  await screen.findByText("当前版本 1");
  const calls = vi.mocked(postIntake).mock.calls;
  expect(calls[0].slice(0, 3)).toEqual(calls[1].slice(0, 3));
  expect(calls[1][1]).toMatchObject({ publication_version: 4, pose_summary: summary });
  expect(onSaved).toHaveBeenCalledExactlyOnceWith(summary);
});

it("requires fresh confirmation for a changed task version and never silently attaches the old summary", async () => {
  const summary = { sample_count: 12, detected_count: 8, framing_check_pass_count: 3 };
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: first });
  const view = render(<PatientReportForm initialReports={[]} publicationVersion={4} poseSummary={summary} />);
  fillTime();
  fireEvent.click(screen.getByLabelText(/将本次反馈关联/));
  fireEvent.click(screen.getByLabelText(/一并提交本次姿态/));
  view.rerender(<PatientReportForm initialReports={[]} publicationVersion={5} poseSummary={null} />);
  expect((screen.getByLabelText(/将本次反馈关联/) as HTMLInputElement).checked).toBe(false);
  expect(screen.queryByLabelText(/一并提交本次姿态/)).toBeNull();
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByText("当前版本 1");
  expect(vi.mocked(postIntake).mock.calls[0][1]).not.toHaveProperty("publication_version");
  expect(vi.mocked(postIntake).mock.calls[0][1]).not.toHaveProperty("pose_summary");
});

it("does not reuse a failed request key if the linked task version changes", async () => {
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 503, value: null }).mockResolvedValueOnce({ status: 201, value: first });
  const view = render(<PatientReportForm initialReports={[]} publicationVersion={4} />);
  fillTime();fireEvent.click(screen.getByLabelText(/将本次反馈关联/));
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "重试保存" });
  view.rerender(<PatientReportForm initialReports={[]} publicationVersion={5} />);
  fireEvent.click(screen.getByRole("button", { name: "重试保存" }));
  await screen.findByText("当前版本 1");
  const calls = vi.mocked(postIntake).mock.calls;
  expect(calls[0][2]).not.toBe(calls[1][2]);
  expect(calls[0][1]).toHaveProperty("publication_version", 4);
  expect(calls[1][1]).not.toHaveProperty("publication_version");
});

it("restores an uncertain new-report retry key after saving a separate correction", async () => {
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 503, value: null })
    .mockResolvedValueOnce({ status: 201, value: { ...first, id: "revision-2", revision_no: 2 } })
    .mockResolvedValueOnce({ status: 201, value: { ...first, id: "new-revision", report_id: "new-report" } });
  render(<PatientReportForm initialReports={[first]} />); fillTime();
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "重试保存" });
  fireEvent.click(screen.getByRole("button", { name: "更正" }));
  fireEvent.change(screen.getByLabelText(/更正原因/), { target: { value: "SYN-核对" } });
  fireEvent.click(screen.getByRole("button", { name: "保存更正" }));
  await screen.findByText("当前版本 2");
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await waitFor(() => expect(postIntake).toHaveBeenCalledTimes(3));
  const calls = vi.mocked(postIntake).mock.calls;
  expect(calls[2].slice(0, 3)).toEqual(calls[0].slice(0, 3));
});
