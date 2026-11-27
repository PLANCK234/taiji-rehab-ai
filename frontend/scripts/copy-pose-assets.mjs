import { copyFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "public", "pose-assets");
const wasmSource = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const modelSource = join(root, "vendor", "pose_landmarker_full.task");
const modelHash = "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1";

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

await mkdir(join(destination, "wasm"), { recursive: true });
for (const name of [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
]) {
  await copyFile(join(wasmSource, name), join(destination, "wasm", name));
}

if ((await stat(modelSource)).size !== 9_398_198 || await sha256(modelSource) !== modelHash) {
  throw new Error("Pose Landmarker model does not match the pinned size and SHA-256");
}
await copyFile(modelSource, join(destination, "pose_landmarker_full.task"));
