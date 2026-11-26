// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PatientTaskFeedback from "./task-feedback";
import { FeedbackLeaveGuard, UnsavedFeedbackNotice } from "./feedback-leave-guard";
import type { PatientPoseCounts } from "../workspace/patient-reports";

const camera = vi.hoisted(() => ({ release: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../participants/[id]/pose-lab/pose-camera", async () => {
  const { useEffect } = await import("react");
  return { default: function Camera({ onTaskSummary, onNextStep }: {
    onTaskSummary: (summary: PatientPoseCounts) => void; onNextStep: () => void;
  }) {
    useEffect(() => () => camera.release(), []);
    return <section aria-label="任务摄像头"><button onClick={() => {
      onTaskSummary({ sample_count: 3, detected_count: 1, framing_check_pass_count: 0 });
      onNextStep();
    }}>结束演示并填写</button></section>;
  } };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function portal(version: number) {
  return <FeedbackLeaveGuard><UnsavedFeedbackNotice /><PatientTaskFeedback
    initialReports={[]} publicationVersion={version} cameraEnabled learning={<p>教学区</p>} /></FeedbackLeaveGuard>;
}
it("hands task summary to feedback, releases the camera and preserves the draft between steps", () => {
  render(portal(4));
  expect(screen.queryByRole("region", { name: "任务摄像头" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "3. 训练" }));
  fireEvent.click(screen.getByRole("button", { name: "结束演示并填写" }));
  expect(camera.release).toHaveBeenCalledOnce();
  expect(screen.getByRole("heading", { name: "反馈 · 训练与不适记录" })).toBe(document.activeElement);
  fireEvent.click(screen.getByLabelText(/将本次反馈关联/));
  expect(screen.getByLabelText(/一并提交本次姿态/)).toBeTruthy();
  expect(screen.getByText(/有未保存的反馈内容/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-25T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "1. 学习" }));
  fireEvent.click(screen.getByRole("button", { name: "4. 反馈" }));
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
});
it("invalidates a previous task summary when publication changes without dropping the feedback draft", () => {
  const view = render(portal(4));
  fireEvent.click(screen.getByRole("button", { name: "3. 训练" }));
  fireEvent.click(screen.getByRole("button", { name: "结束演示并填写" }));
  fireEvent.click(screen.getByLabelText(/将本次反馈关联/));
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-25T10:00" } });
  view.rerender(portal(5));
  fireEvent.click(screen.getByLabelText(/将本次反馈关联/));
  expect(screen.queryByLabelText(/一并提交本次姿态/)).toBeNull();
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
});
