// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PatientJourney from "./journey";
import PatientReportForm from "./report-form";
import { postIntake } from "../workspace/intake";

vi.mock("../workspace/intake", () => ({ postIntake: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function setup() {
  return render(<PatientJourney learning={<section><h3>训练计划与视频</h3><p>视频待添加</p></section>}
    feedback={<PatientReportForm initialReports={[]} />} />);
}

it("shows one current step and supports previous, next and direct feedback navigation", () => {
  setup();
  expect(screen.getByRole("button", { name: "1. 学习" }).getAttribute("aria-current")).toBe("step");
  expect((screen.getByRole("button", { name: "上一步" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "查看准备 →" }));
  expect(screen.getByRole("heading", { name: "准备 · 摄像头与环境" })).toBe(document.activeElement);
  expect(screen.getAllByRole("region")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "上一步" }));
  expect(screen.getByRole("heading", { name: "学习 · 训练计划与视频" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "4. 反馈" }));
  expect(screen.getByRole("heading", { name: "新增本人记录" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "返回学习" }));
  expect(screen.getByText("视频待添加")).toBeTruthy();
  expect(postIntake).not.toHaveBeenCalled();
});

it("keeps unsaved feedback when browsing other steps, without writing a record", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "4. 反馈" }));
  fireEvent.change(screen.getByLabelText("发生时间（北京时间）"), { target: { value: "2026-11-25T10:00" } });
  fireEvent.change(screen.getByLabelText("实际训练情况"), { target: { value: "performed" } });
  fireEvent.change(screen.getByLabelText("实际时长（分钟，可留空表示未知）"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "1. 学习" }));
  fireEvent.click(screen.getByRole("button", { name: "4. 反馈" }));
  expect((screen.getByLabelText("发生时间（北京时间）") as HTMLInputElement).value).toBe("2026-11-25T10:00");
  expect((screen.getByLabelText("实际时长（分钟，可留空表示未知）") as HTMLInputElement).value).toBe("10");
  expect(postIntake).not.toHaveBeenCalled();
});

it("keeps camera and training unavailable rather than fabricating completion", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "2. 准备" }));
  expect((screen.getByRole("button", { name: "摄像头尚未接入" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "查看训练 →" }));
  expect((screen.getByRole("button", { name: "开始训练（待接入）" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("heading", { name: "训练尚未开始" })).toBeTruthy();
  expect(postIntake).not.toHaveBeenCalled();
});
