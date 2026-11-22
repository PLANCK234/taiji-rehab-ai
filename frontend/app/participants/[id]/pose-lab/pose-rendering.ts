import { POSE_CONNECTIONS, type PoseFrame, type PosePoint } from "./pose-analysis";

export type PoseLandmarkerLike = {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): {
    landmarks?: PosePoint[][];
    worldLandmarks?: PosePoint[][];
  };
  close(): void;
};

export async function createLandmarker(): Promise<PoseLandmarkerLike> {
    const mediaPipe = await import("@mediapipe/tasks-vision");
    const vision = await mediaPipe.FilesetResolver.forVisionTasks("/pose-assets/wasm");
    const options = {
      baseOptions: { modelAssetPath: "/pose-assets/pose_landmarker_full.task", delegate: "GPU" as const },
      runningMode: "VIDEO" as const, numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    };
    try {
      return await mediaPipe.PoseLandmarker.createFromOptions(vision, options);
    } catch {
      return await mediaPipe.PoseLandmarker.createFromOptions(vision, {
        ...options, baseOptions: { ...options.baseOptions, delegate: "CPU" as const },
      });
    }
}

export function drawSkeleton(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: PoseFrame | undefined) {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);
  if (!frame?.detected) return;
  context.lineWidth = Math.max(3, width / 320);
  context.lineCap = "round";
  context.strokeStyle = "#7bf0b5";
  for (const [from, to] of POSE_CONNECTIONS) {
    const a = frame.landmarks[from];
    const b = frame.landmarks[to];
    if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
    context.beginPath();
    context.moveTo(a.x * width, a.y * height);
    context.lineTo(b.x * width, b.y * height);
    context.stroke();
  }
  context.fillStyle = "#fff4a8";
  for (const point of frame.landmarks) {
    if ((point.visibility ?? 1) < 0.5) continue;
    context.beginPath();
    context.arc(point.x * width, point.y * height, Math.max(3, width / 260), 0, Math.PI * 2);
    context.fill();
  }
}
