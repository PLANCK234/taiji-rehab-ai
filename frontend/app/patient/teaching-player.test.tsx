// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TeachingPlayer from "./teaching-player";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const videos = [{ id: "teaching-01", title: "起势", duration_seconds: 10.7 }, { id: "teaching-02", title: "野马分鬃", duration_seconds: 27.2 }];

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
