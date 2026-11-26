// Build-time only: no patient images are sent to a model service or CDN.
import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const target = new URL("../public/pose-assets/", import.meta.url);
await mkdir(target, { recursive: true });
const modelUrl = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const modelPath = new URL("pose_landmarker_lite.task", target);
let data;
try { data = await readFile(modelPath); } catch {
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error(`Pose model download failed: ${response.status}`);
  data = Buffer.from(await response.arrayBuffer());
}
const sha256 = createHash("sha256").update(data).digest("hex");
const lockPath = new URL("../pose-model.lock.json", import.meta.url);
const lock = JSON.parse(await readFile(lockPath, "utf8"));
if (sha256 !== lock.sha256 || lock.url !== modelUrl) throw new Error("Pose model hash mismatch");
await writeFile(modelPath, data);
await cp(new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url),
  new URL("wasm/", target), { recursive: true });
await cp(new URL("../node_modules/@mediapipe/tasks-vision/vision_bundle.cjs", import.meta.url),
  new URL("vision_bundle.js", target));
await cp(new URL("../workers/pose-worker.js", import.meta.url), new URL("pose-worker.js", target));
await writeFile(new URL("manifest.json", target), JSON.stringify(lock));
console.log(`Prepared local pose assets: ${sha256} at ${fileURLToPath(target)}`);
