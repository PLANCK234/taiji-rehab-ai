import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? process.env.DEMO_PASSWORD;
if (!password) throw new Error("pose prototype test requires synthetic E2E_PASSWORD");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("demo-clinician-a@example.org");
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "研究工作台" })).toBeVisible();
}

test("local synthetic video produces landmarks, kinematics and export without upload", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "SYN-001" }).click();
  await page.getByRole("link", { name: "打开本地视频姿态实验室" }).click();
  await expect(page.getByRole("heading", { name: "视频姿态与运动学实验室" })).toBeVisible();

  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`);
  });
  await page.getByRole("checkbox", { name: /我确认这是合成视频/ }).check();
  const png = await readFile(path.join(process.cwd(), "e2e", "fixtures", "synthetic-pose-person.png"));
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 768;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.start();
    for (let frame = 0; frame < 12; frame += 1) {
      context.fillStyle = "#eeeeee"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, frame % 2, 0, canvas.width, canvas.height);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    const file = new File(chunks, "synthetic-pose.webm", { type: "video/webm" });
    const transfer = new DataTransfer(); transfer.items.add(file);
    const input = document.querySelector<HTMLInputElement>("#pose-video")!;
    Object.defineProperty(input, "files", { configurable: true, value: transfer.files });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, dataUrl);

  await expect(page.getByText(/已在浏览器本地载入/)).toBeVisible();
  await page.getByRole("button", { name: "开始本地分析" }).click();
  await expect(page.getByText(/分析完成：/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "2. 技术测量结果" })).toBeVisible();
  await expect(page.getByText(/识别覆盖/)).toBeVisible();
  await expect(page.locator("canvas[aria-label='识别到的人体骨架叠加层']")).toBeVisible();
  expect(writes).toEqual([]);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出 JSON" }).click(),
  ]);
  const exported = JSON.parse(await readFile((await download.path())!, "utf8")) as {
    schema_version: string; frames: Array<{ detected: boolean; landmarks: unknown[] }>;
  };
  expect(exported.schema_version).toBe("pose-prototype-v1");
  expect(exported.frames.some((frame) => frame.detected && frame.landmarks.length === 33)).toBe(true);

  const [annotationDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出人工标注模板" }).click(),
  ]);
  const annotationCsv = await readFile((await annotationDownload.path())!, "utf8");
  expect(annotationCsv).toContain("manual_event_label,manual_repeat_index,manual_phase_label");
  expect(annotationCsv).not.toContain("synthetic-pose.webm");
});
