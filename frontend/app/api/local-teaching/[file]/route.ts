import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getCurrentUser } from "../../../../lib/auth";
import { readPatientHome } from "../../../patient/home";
import { localTeachingVideos } from "../../../patient/local-teaching-server";
import { videoRange } from "../../../patient/local-teaching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ file: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (process.env.LOCAL_TEACHING_PREVIEW_ENABLED !== "true" || !process.env.LOCAL_TEACHING_VIDEO_DIR) {
    return new Response(null, { status: 404, headers });
  }
  const cookies = request.headers.get("cookie") ?? "";
  const user = await getCurrentUser(cookies);
  if (!user) return new Response(null, { status: 401, headers });
  if (user.role !== "patient") return new Response(null, { status: 403, headers });
  const home = await readPatientHome(cookies);
  if (home.kind !== "ready") return new Response(null, { status: home.kind === "session_expired" ? 401 : home.kind === "binding_unavailable" ? 403 : 503, headers });
  const { file } = await context.params;
  const match = /^(teaching-\d{2})\.(mp4|jpg)$/.exec(file);
  const videos = await localTeachingVideos();
  if (!match || !videos.some((video) => video.id === match[1])) return new Response(null, { status: 404, headers });
  try {
    const directory = await realpath(process.env.LOCAL_TEACHING_VIDEO_DIR);
    const filename = await realpath(path.join(directory, file));
    if (path.dirname(filename) !== directory) return new Response(null, { status: 404, headers });
    const info = await stat(filename);
    if (!info.isFile()) return new Response(null, { status: 404, headers });
    const rangeHeader = request.headers.get("range");
    const range = videoRange(rangeHeader, info.size);
    if (!range) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${info.size}` } });
    const stream = createReadStream(filename, { ...range, signal: request.signal });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: rangeHeader ? 206 : 200,
      headers: { ...headers, "Content-Type": match[2] === "mp4" ? "video/mp4" : "image/jpeg",
        "Accept-Ranges": "bytes", "Content-Length": String(range.end - range.start + 1),
        ...(rangeHeader ? { "Content-Range": `bytes ${range.start}-${range.end}/${info.size}` } : {}),
      },
    });
  } catch { return new Response(null, { status: 404, headers }); }
}
