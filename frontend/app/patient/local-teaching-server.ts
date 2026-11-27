import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseTeachingManifest, type LocalTeachingVideo } from "./local-teaching";

export async function localTeachingVideos(): Promise<LocalTeachingVideo[]> {
  const directory = process.env.LOCAL_TEACHING_VIDEO_DIR;
  if (process.env.LOCAL_TEACHING_PREVIEW_ENABLED !== "true" || !directory) return [];
  try {
    return parseTeachingManifest(JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8")));
  } catch { return []; }
}
