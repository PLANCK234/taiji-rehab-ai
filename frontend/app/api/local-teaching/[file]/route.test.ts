import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ user: vi.fn(), home: vi.fn(), videos: vi.fn() }));
vi.mock("../../../workspace/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("../../../patient/home", () => ({ readPatientHome: mocks.home }));
vi.mock("../../../patient/local-teaching-server", () => ({ localTeachingVideos: mocks.videos }));
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "taiji-teaching-test-"));
  vi.stubEnv("LOCAL_TEACHING_PREVIEW_ENABLED", "true");
  vi.stubEnv("LOCAL_TEACHING_VIDEO_DIR", directory);
  await writeFile(path.join(directory, "teaching-01.mp4"), "0123456789");
  mocks.user.mockResolvedValue({ role: "patient" });
  mocks.home.mockResolvedValue({ kind: "ready" });
  mocks.videos.mockResolvedValue([{ id: "teaching-01" }]);
});
afterEach(async () => { await rm(directory, { recursive: true }); vi.unstubAllEnvs(); vi.clearAllMocks(); });
function read(file = "teaching-01.mp4", range?: string) {
  return GET(new Request("http://localhost/api/local-teaching/" + file, { headers: range ? { range } : {} }), { params: Promise.resolve({ file }) });
}

it("requires opt-in, patient login and a currently valid self binding on every read", async () => {
  vi.stubEnv("LOCAL_TEACHING_PREVIEW_ENABLED", "false"); expect((await read()).status).toBe(404);
  vi.stubEnv("LOCAL_TEACHING_PREVIEW_ENABLED", "true");
  mocks.user.mockResolvedValue(null); expect((await read()).status).toBe(401);
  mocks.user.mockResolvedValue({ role: "clinician" }); expect((await read()).status).toBe(403);
  mocks.user.mockResolvedValue({ role: "patient" });
  mocks.home.mockResolvedValue({ kind: "binding_unavailable" }); expect((await read()).status).toBe(403);
  mocks.home.mockResolvedValue({ kind: "service_unavailable" }); expect((await read()).status).toBe(503);
});

it("serves authenticated byte ranges without shared cache or arbitrary paths", async () => {
  const response = await read("teaching-01.mp4", "bytes=2-4");
  expect(response.status).toBe(206); expect(await response.text()).toBe("234");
  expect(response.headers.get("Content-Range")).toBe("bytes 2-4/10");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect((await read("teaching-01.mp4", "bytes=11-")).status).toBe(416);
  expect((await read("../manifest.json")).status).toBe(404);
  expect((await read("teaching-02.mp4")).status).toBe(404);
});

it("rejects symlinks pointing outside the configured media directory", async () => {
  const outside = path.join(directory, "..", path.basename(directory) + "-outside");
  await writeFile(outside, "private");
  try {
    await rm(path.join(directory, "teaching-01.mp4"));
    await symlink(outside, path.join(directory, "teaching-01.mp4"));
    expect((await read()).status).toBe(404);
  } finally { await rm(outside); }
});
