// Classic worker: MediaPipe's WASM loader uses importScripts.
self.exports = {};
importScripts("/pose-assets/vision_bundle.js");
const vision = self.exports;
let landmarker;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const files = await vision.FilesetResolver.forVisionTasks("/pose-assets/wasm");
      landmarker = await vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/pose-assets/pose_landmarker_lite.task", delegate: "CPU" },
        runningMode: "VIDEO", numPoses: 2,
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ id: data.id, ready: true });
    } else {
      try {
        if (!landmarker) throw new Error("Pose model not initialized");
        const start = performance.now();
        const result = landmarker.detectForVideo(data.bitmap, data.timestamp);
        self.postMessage({
          id: data.id, pose_count: result.landmarks.length,
          landmarks: result.landmarks.length === 1 ? result.landmarks[0].map(p => ({
            x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0,
          })) : [], inference_ms: performance.now() - start,
        });
      } finally { data.bitmap?.close(); }
    }
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error) });
  }
};
