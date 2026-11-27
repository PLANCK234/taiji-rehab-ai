/** File sampling follows media time, rather than the speed of model inference. */
export const FILE_STEP_MS = 200;
export const MAX_CAPTURE_MS = 300_000;
export const MAX_CAPTURE_FRAMES = 1800;

export function sampleTimes(durationMs: number): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error("视频时长无效。");
  const end = Math.min(durationMs, MAX_CAPTURE_MS);
  return Array.from({ length: Math.min(Math.ceil(end / FILE_STEP_MS), MAX_CAPTURE_FRAMES) },
    (_, index) => index * FILE_STEP_MS);
}

export async function seekFrame(video: HTMLVideoElement, seconds: number): Promise<void> {
  if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - seconds) < .001) return;
  await new Promise<void>((resolve, reject) => {
    const clean = () => {
      clearTimeout(timer); video.removeEventListener("seeked", done); video.removeEventListener("error", fail);
    };
    const done = () => { clean(); resolve(); };
    const fail = () => { clean(); reject(new Error("视频定位失败，请重新选择可解码视频。")); };
    const timer = setTimeout(fail, 15_000);
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    try { video.currentTime = seconds; } catch { fail(); }
  });
}

export async function fileDurationMs(video: HTMLVideoElement): Promise<number> {
  video.pause();
  // Some MediaRecorder WebM files omit the duration metadata. Seeking to the end
  // makes the decoder discover it; never treat these local files as a live clock.
  if (!Number.isFinite(video.duration)) await seekFrame(video, 1e10);
  const seconds = Number.isFinite(video.duration) ? video.duration : video.currentTime;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= 1e10) {
    throw new Error("无法确定视频时长，请转换为带有效时长的MP4或WebM。");
  }
  await seekFrame(video, 0);
  return seconds * 1000;
}
