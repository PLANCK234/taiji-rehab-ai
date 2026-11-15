// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PoseVideoLab from "./pose-video-lab";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PoseVideoLab", () => {
  it("keeps file access gated by explicit local-use confirmation", () => {
    render(<PoseVideoLab />);
    const fileInput = screen.getByLabelText(/视频文件/);
    expect(fileInput.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /我确认这是合成视频/ }));
    expect(fileInput.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText(/不上传至服务器/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "开始本地分析" }).hasAttribute("disabled")).toBe(true);
  });

  it("does not call a network upload when confirmation changes", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<PoseVideoLab />);
    fireEvent.click(screen.getByRole("checkbox", { name: /我确认这是合成视频/ }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("adds and removes a browser-memory manual timestamp annotation", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:pose-test"),
      revokeObjectURL: vi.fn(),
    });
    const { container } = render(<PoseVideoLab />);
    fireEvent.click(screen.getByRole("checkbox", { name: /我确认这是合成视频/ }));
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    Object.defineProperties(video!, {
      readyState: { configurable: true, value: 1 },
      duration: { configurable: true, value: 2 },
      currentTime: { configurable: true, writable: true, value: 0.6 },
    });
    const file = new File(["test"], "synthetic.webm", { type: "video/webm" });
    fireEvent.change(screen.getByLabelText(/视频文件/), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("heading", { name: "2. 本地人工时间点标注" })).toBeTruthy());

    fireEvent.change(screen.getByLabelText("事件标签（必填）"), { target: { value: "人工事件 A" } });
    fireEvent.change(screen.getByLabelText("重复序号（可选）"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("阶段标签（可选）"), { target: { value: "自定义阶段" } });
    fireEvent.change(screen.getByLabelText("人工参考角度（可选，度）"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "标记当前时刻" }));
    expect(screen.getByRole("alert").textContent).toContain("请先选择对应关节");
    expect(screen.queryByRole("cell", { name: "人工事件 A" })).toBeNull();

    fireEvent.change(screen.getByLabelText("参考关节（可选）"), { target: { value: "left_knee" } });
    fireEvent.click(screen.getByRole("button", { name: "标记当前时刻" }));

    expect(screen.getByRole("cell", { name: "人工事件 A" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "0.6 秒" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "90.0°" })).toBeTruthy();
    expect(screen.getAllByRole("cell", { name: "未知" })).toHaveLength(2);
    expect(screen.getByText("0 / 1")).toBeTruthy();
    expect(screen.getByText("角度对照摘要（描述性）")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByText("尚未添加人工标注。")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
