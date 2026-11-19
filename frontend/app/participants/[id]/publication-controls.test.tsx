// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PublicationControls from "./publication-controls";
import { postIntake } from "../../workspace/intake";

vi.mock("../../workspace/intake", () => ({ postIntake: vi.fn() }));

beforeEach(() => vi.mocked(postIntake).mockReset());
afterEach(cleanup);

it("requires explicit synthetic acknowledgement and shows append-only publish/withdraw versions", async () => {
  vi.mocked(postIntake)
    .mockResolvedValueOnce({ status: 201, value: {
      version: 1, state: "published", marker: "SYNTHETIC_PROCESS_ONLY",
      message: "合成发布流程测试卡片；没有可执行的训练计划。",
      video_status: "awaiting_review", card_code: "SYN-CARD-A",
      card_title: "演示卡片 A · 初次查看",
    } })
    .mockResolvedValueOnce({ status: 201, value: {
      version: 2, state: "withdrawn", marker: "SYNTHETIC_PROCESS_ONLY",
      message: "合成发布流程测试卡片；没有可执行的训练计划。",
      video_status: "awaiting_review", card_code: "SYN-CARD-A",
      card_title: "演示卡片 A · 初次查看",
    } });
  render(<PublicationControls participantId="synthetic-id" initialHistory={[]} cardOptions={[{ code: "SYN-CARD-A", title: "演示卡片 A · 初次查看" }]} readiness={{ simulated_consent_granted: true, active_patient_binding: true, can_publish: true }} canPublish />);
  const publish = screen.getByRole("button", { name: "发布所选测试卡片" });
  expect((publish as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("选择演示卡片"), { target: { value: "SYN-CARD-A" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /确认本次选择/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /合成流程测试/ }));
  fireEvent.click(publish);
  await waitFor(() => expect(screen.getByText(/合成卡片已发布/)).toBeTruthy());
  expect(vi.mocked(postIntake).mock.calls[0]?.[1]).toMatchObject({
    operation: "publish", expected_version: 0,
    card_code: "SYN-CARD-A", selection_confirmed: true,
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /合成流程测试/ }));
  fireEvent.click(screen.getByRole("button", { name: "撤回测试卡片" }));
  await waitFor(() => expect(screen.getByText(/版本 2 · 撤回/)).toBeTruthy());
  expect(vi.mocked(postIntake).mock.calls[1]?.[1]).toMatchObject({
    operation: "withdraw", expected_version: 1,
  });
  expect(screen.getByText(/版本 1 · 发布/)).toBeTruthy();
  expect(screen.getByText(/版本 2 · 撤回/)).toBeTruthy();
});

it("explains missing publication conditions and prevents submission", () => {
  render(<PublicationControls participantId="synthetic-id" initialHistory={[]} cardOptions={[{ code: "SYN-CARD-A", title: "演示卡片 A · 初次查看" }]} readiness={{ simulated_consent_granted: false, active_patient_binding: false, can_publish: false }} canPublish />);
  expect(screen.getByText(/当前模拟同意：未记录或已撤回/)).toBeTruthy();
  expect(screen.getByText(/合成患者绑定：无活跃绑定/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "重新检查发布条件" }).getAttribute("href")).toBe("/participants/synthetic-id#publication-heading");
  fireEvent.change(screen.getByLabelText("选择演示卡片"), { target: { value: "SYN-CARD-A" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /确认本次选择/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /合成流程测试/ }));
  expect((screen.getByRole("button", { name: "发布所选测试卡片" }) as HTMLButtonElement).disabled).toBe(true);
  expect(vi.mocked(postIntake)).not.toHaveBeenCalled();
});

it("keeps unknown readiness distinct from a failed condition", () => {
  render(<PublicationControls participantId="synthetic-id" initialHistory={[]} cardOptions={[]} readiness={null} canPublish />);
  expect(screen.getByText("发布条件暂不可用，不能发布新卡片。")).toBeTruthy();
  expect(screen.queryByText(/合成患者绑定：无活跃绑定/)).toBeNull();
});
