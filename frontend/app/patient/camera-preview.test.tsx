// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CameraPreview from "./camera-preview";

const originalDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const getUserMedia = vi.fn();
beforeEach(() => {
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); getUserMedia.mockReset();
  if (originalDevices) Object.defineProperty(navigator, "mediaDevices", originalDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
});
function media() {
  const track = { stop: vi.fn(), onended: null as (() => void) | null };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  return { stream, track };
}

it("opens only on request, requests no audio and closes every track", async () => {
  const { stream, track } = media(); getUserMedia.mockResolvedValue(stream);
  render(<CameraPreview />);
  expect(getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  await screen.findByText("摄像头已打开 · 仅本机预览");
  expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
  const video = screen.getByLabelText("本机摄像头预览") as HTMLVideoElement;
  expect(video.srcObject).toBe(stream); expect(video.muted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "关闭摄像头" }));
  expect(track.stop).toHaveBeenCalledOnce(); expect(video.srcObject).toBeNull();
});

it.each([
  ["NotAllowedError", "未获得摄像头权限"], ["NotFoundError", "没有找到摄像头"],
  ["NotReadableError", "可能正被其他程序占用"], ["AbortError", "摄像头暂时无法打开"],
])("explains %s and permits a successful retry", async (name, text) => {
  getUserMedia.mockRejectedValueOnce({ name }).mockResolvedValueOnce(media().stream);
  render(<CameraPreview />);
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(text));
  fireEvent.click(screen.getByRole("button", { name: "重试打开摄像头" }));
  await screen.findByText("摄像头已打开 · 仅本机预览");
});

it("stops a late permission result after cancellation without reopening the preview", async () => {
  let resolve!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise<MediaStream>((done) => { resolve = done; }));
  const { stream, track } = media(); render(<CameraPreview />);
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  fireEvent.click(screen.getByRole("button", { name: "取消等待" }));
  await act(async () => { resolve(stream); });
  expect(track.stop).toHaveBeenCalledOnce();
  expect(screen.queryByText("摄像头已打开 · 仅本机预览")).toBeNull();
});

it("stops late streams on unmount and suppresses duplicate opening requests", async () => {
  let resolve!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise<MediaStream>((done) => { resolve = done; }));
  const { stream, track } = media(); const view = render(<CameraPreview />);
  const button = screen.getByRole("button", { name: "打开摄像头" });
  fireEvent.click(button); fireEvent.click(button); expect(getUserMedia).toHaveBeenCalledOnce();
  view.unmount(); await act(async () => { resolve(stream); });
  expect(track.stop).toHaveBeenCalledOnce();
});

it("stops on a hidden tab and on unmount, with no automatic reopening", async () => {
  const first = media(); const second = media();
  getUserMedia.mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
  const view = render(<CameraPreview />);
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  await screen.findByText("摄像头已打开 · 仅本机预览");
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(first.track.stop).toHaveBeenCalledOnce();
  fireEvent(document, new Event("visibilitychange")); expect(getUserMedia).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  await screen.findByText("摄像头已打开 · 仅本机预览");
  view.unmount(); expect(second.track.stop).toHaveBeenCalledOnce();
});

it("reports device interruption and releases a stream if playback fails", async () => {
  const first = media(); const second = media();
  getUserMedia.mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
  render(<CameraPreview />);
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  await screen.findByText("摄像头已打开 · 仅本机预览");
  act(() => { first.track.onended?.(); });
  expect(screen.getByRole("alert").textContent).toContain("连接已中断");
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce({ name: "AbortError" });
  fireEvent.click(screen.getByRole("button", { name: "重试打开摄像头" }));
  await waitFor(() => expect(second.track.stop).toHaveBeenCalledOnce());
});

it("explains unsupported or insecure browser access without requesting a device", () => {
  vi.stubGlobal("isSecureContext", false); render(<CameraPreview />);
  fireEvent.click(screen.getByRole("button", { name: "打开摄像头" }));
  expect(screen.getByRole("alert").textContent).toContain("HTTPS"); expect(getUserMedia).not.toHaveBeenCalled();
});
