// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TeachingPlayer from "./teaching-player";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const videos = [{ id: "teaching-01", title: "起势", duration_seconds: 10.7 }, { id: "teaching-02", title: "野马分鬃", duration_seconds: 27.2 }];

it("does not show an old playback failure after the user switches clips", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  let reject!: (reason: Error) => void;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  render(<TeachingPlayer videos={videos} active />);
  fireEvent.click(screen.getByRole("button", { name: "从头重播" }));
  fireEvent.click(screen.getByRole("button", { name: "下一段 →" }));
  await act(async () => { reject(new Error("old playback interrupted")); });
  expect(screen.getByLabelText("野马分鬃教学视频")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("moves through clips without autoplay and shows the correct position and original duration", () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  render(<TeachingPlayer videos={videos} active />);
  expect((screen.getByRole("button", { name: "← 上一段" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("当前第 1 段，共 2 段 · 原片时长 0:10")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "下一段 →" }));
  expect(screen.getByLabelText("野马分鬃教学视频")).toBeTruthy();
  expect(screen.getByText("当前第 2 段，共 2 段 · 原片时长 0:27")).toBeTruthy();
  expect((screen.getByRole("button", { name: "下一段 →" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "← 上一段" }));
  expect(screen.getByLabelText("起势教学视频")).toBeTruthy();
  expect(play).not.toHaveBeenCalled();
});

it("preserves the speed on clip change and reload and follows native rate changes", () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  render(<TeachingPlayer videos={videos} active />);
  fireEvent.change(screen.getByLabelText("播放速度"), { target: { value: "0.75" } });
  expect((screen.getByLabelText("起势教学视频") as HTMLVideoElement).playbackRate).toBe(0.75);
  fireEvent.click(screen.getByRole("button", { name: "下一段 →" }));
  let video = screen.getByLabelText("野马分鬃教学视频") as HTMLVideoElement;
  fireEvent.loadedMetadata(video);
  expect(video.playbackRate).toBe(0.75);
  fireEvent.error(video); fireEvent.click(screen.getByRole("button", { name: "重新加载视频" }));
  video = screen.getByLabelText("野马分鬃教学视频") as HTMLVideoElement;
  expect(video.playbackRate).toBe(0.75);
  video.playbackRate = 1.75; fireEvent.rateChange(video);
  expect((screen.getByLabelText("播放速度") as HTMLSelectElement).value).toBe("1.75");
});

it("disables both navigation buttons for a single clip and renders nothing for an empty list", () => {
  const view = render(<TeachingPlayer videos={[videos[0]]} active />);
  for (const name of ["← 上一段", "下一段 →"]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<TeachingPlayer videos={[]} active />);
  expect(screen.queryByLabelText("播放速度")).toBeNull();
});

it("offers a local playlist, never autoplays, pauses on navigation and handles load errors", () => {
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const view = render(<TeachingPlayer videos={videos} active />);
  const video = screen.getByLabelText("起势教学视频") as HTMLVideoElement;
  expect(video.autoplay).toBe(false);
  expect(video.getAttribute("src")).toBe("/api/local-teaching/teaching-01.mp4");
  view.rerender(<TeachingPlayer videos={videos} active={false} />);
  expect(pause).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /野马分鬃/ }));
  const next = screen.getByLabelText("野马分鬃教学视频");
  expect(next.getAttribute("src")).toBe("/api/local-teaching/teaching-02.mp4");
  fireEvent.error(next);
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "重新加载视频" }));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("replays from zero only after the user requests it", async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  render(<TeachingPlayer videos={videos} active />);
  const video = screen.getByLabelText("起势教学视频") as HTMLVideoElement;
  video.currentTime = 5;
  fireEvent.click(screen.getByRole("button", { name: "从头重播" }));
  expect(video.currentTime).toBe(0);
  expect(play).toHaveBeenCalledOnce();
});
