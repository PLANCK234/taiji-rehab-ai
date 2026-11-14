// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PoseVideoLab from "./pose-video-lab";

afterEach(cleanup);

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
    fetchSpy.mockRestore();
  });
});
