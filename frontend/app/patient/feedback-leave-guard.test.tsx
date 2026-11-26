// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FeedbackLeaveGuard, PatientLogoutButton, UnsavedFeedbackNotice } from "./feedback-leave-guard";
import PatientReportForm from "./report-form";
import { postIntake } from "../workspace/intake";
import type { PatientReport } from "../workspace/patient-reports";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("../workspace/intake", () => ({ postIntake: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.mocked(postIntake).mockReset(); navigation.replace.mockReset(); document.cookie = "taiji_csrf=; max-age=0"; });
const row: PatientReport = { id: "revision-1", report_id: "report-1", participant_id: "synthetic-participant", revision_no: 1,
  observed_at: "2026-11-25T02:00:00Z", activity_state: "unknown", actual_minutes: null, discomfort_state: "unknown", discomfort_note: null,
  change_reason: null, recorded_by: "synthetic-patient", recorded_at: "2026-11-25T02:05:00Z" };
function setup(reports: PatientReport[] = []) {
  return render(<FeedbackLeaveGuard><UnsavedFeedbackNotice /><PatientReportForm initialReports={reports} /><PatientLogoutButton /></FeedbackLeaveGuard>);
}
function fill() { fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-25T10:00" } }); }
function preventsUnload() { return !window.dispatchEvent(new Event("beforeunload", { cancelable: true })); }

it("warns only while meaningful new content exists and removes the handler on unmount", () => {
  const view = setup(); expect(preventsUnload()).toBe(false);
  fill(); expect(screen.getByText(/有未保存的反馈内容/)).toBeTruthy(); expect(preventsUnload()).toBe(true);
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "" } });
  expect(screen.queryByText(/有未保存的反馈内容/)).toBeNull(); expect(preventsUnload()).toBe(false);
  fill(); view.unmount(); expect(preventsUnload()).toBe(false);
});

it("keeps warnings after a failed save and clears them after confirmed success", async () => {
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 503, value: null }).mockResolvedValueOnce({ status: 201, value: row });
  setup(); fill(); fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  await screen.findByRole("button", { name: "重试保存" }); expect(preventsUnload()).toBe(true);
  expect(screen.getByText(/有未保存的反馈内容/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "重试保存" })); await screen.findByText("当前版本 1");
  // The report can render before the effect updates the provider's notice.
  // Wait for both the navigation guard and this specific notice, not every status message.
  await waitFor(() => {
    expect(preventsUnload()).toBe(false);
    expect(screen.queryByText(/有未保存的反馈内容/)).toBeNull();
  });
});

it("does not warn on untouched correction, but confirms before discarding a changed correction", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  setup([row]); fireEvent.click(screen.getByRole("button", { name: "更正" }));
  expect(preventsUnload()).toBe(false);
  fireEvent.change(screen.getByLabelText(/更正原因/), { target: { value: "SYN-核对" } });
  expect(preventsUnload()).toBe(true);
  fireEvent.change(screen.getByLabelText(/更正原因/), { target: { value: "" } });
  expect(preventsUnload()).toBe(false);
  fireEvent.change(screen.getByLabelText(/更正原因/), { target: { value: "SYN-核对" } });
  fireEvent.click(screen.getByRole("button", { name: "取消更正" }));
  expect((screen.getByLabelText(/更正原因/) as HTMLInputElement).value).toBe("SYN-核对");
  confirm.mockReturnValue(true); fireEvent.click(screen.getByRole("button", { name: "取消更正" }));
  expect(preventsUnload()).toBe(false);
});

it("continues protecting an unsaved new-report draft after a correction is saved", async () => {
  vi.mocked(postIntake).mockResolvedValue({ status: 201, value: { ...row, id: "revision-2", revision_no: 2 } });
  setup([row]); fill(); fireEvent.click(screen.getByRole("button", { name: "更正" }));
  fireEvent.change(screen.getByLabelText(/更正原因/), { target: { value: "SYN-更正" } });
  fireEvent.click(screen.getByRole("button", { name: "保存更正" })); await screen.findByText("当前版本 2");
  await waitFor(() => {
    expect(preventsUnload()).toBe(true);
    expect(screen.getByText(/有未保存的反馈内容/)).toBeTruthy();
  });
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
});

it("cancels logout without a request, retains warning on failure, and clears it only on success", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true }); vi.stubGlobal("fetch", fetcher);
  document.cookie = "taiji_csrf=SYN-token";
  setup(); fill(); fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
  expect(fetcher).not.toHaveBeenCalled(); expect(preventsUnload()).toBe(true);
  confirm.mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "退出登录" })); });
  expect(screen.getByText("退出失败，请稍后重试。")).toBeTruthy(); expect(preventsUnload()).toBe(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "退出登录" })); });
  expect(navigation.replace).toHaveBeenCalledWith("/login"); expect(preventsUnload()).toBe(false);
});
