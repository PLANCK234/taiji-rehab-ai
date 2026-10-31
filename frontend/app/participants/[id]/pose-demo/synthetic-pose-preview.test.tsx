// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SyntheticPosePreview from "./synthetic-pose-preview";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("synthetic pose preview", () => {
  it("generates and clears only an in-memory illustration", () => {
    const network = vi.spyOn(globalThis, "fetch");
    const camera = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: camera },
    });
    const writeStorage = vi.fn();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: { setItem: writeStorage },
    });

    const { container } = render(<SyntheticPosePreview />);
    const generate = screen.getByRole("button", { name: "生成合成示意画面" });
    const clear = screen.getByRole("button", { name: "清除预览" });
    expect(clear.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("img")).toBeNull();

    fireEvent.click(generate);
    expect(screen.getByRole("img", { name: "第 1 幅合成线条人物示意图" })).toBeTruthy();
    fireEvent.click(generate);
    expect(screen.getByRole("img", { name: "第 2 幅合成线条人物示意图" })).toBeTruthy();
    fireEvent.click(clear);
    expect(screen.queryByRole("img")).toBeNull();
    expect(clear.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector("input[type=file], video, form")).toBeNull();
    expect(network).not.toHaveBeenCalled();
    expect(camera).not.toHaveBeenCalled();
    expect(writeStorage).not.toHaveBeenCalled();
  });
});
