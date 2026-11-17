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
  const [poseDocument] = await Promise.all([
    page.waitForResponse((response) => response.request().isNavigationRequest()
      && new URL(response.url()).pathname.endsWith("/pose-lab")),
    page.getByRole("link", { name: "打开本地视频姿态实验室" }).click(),
  ]);
  expect(poseDocument.headers()["content-security-policy"]).toContain("connect-src 'self'");
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
  await expect(page.getByRole("heading", { name: "3. 技术测量结果" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "关节角度时间曲线" })).toBeVisible();
  const candidates = page.getByRole("region", { name: "坐站候选（实验）" });
  await candidates.getByRole("button", { name: "查找坐站候选" }).click();
  await expect(candidates.getByRole("status")).toHaveText(/无法计次|检测到 \d+ 次坐站候选/);
  await page.getByRole("button", { name: "开始本地分析" }).click();
  await expect(page.getByText(/分析完成：/)).toBeVisible({ timeout: 60_000 });
  await expect(candidates.getByRole("status")).toHaveCount(0);
  await page.getByLabel("显示关节").selectOption("right_knee");
  await expect(page.getByRole("img", { name: /右膝角度随时间变化；缺失处断开/ })).toBeVisible();
  await page.getByLabel(/曲线时间定位/).fill("0.2");
  await expect(page.getByLabel(/曲线时间定位/)).toHaveValue("0.2");
  await expect(page.getByText("曲线时间定位：0.2 秒")).toBeVisible();
  const positionedTime = await page.locator("video").evaluate((video) => (video as HTMLVideoElement).currentTime);
  expect(positionedTime).toBeCloseTo(0.2, 1);
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

  await page.getByLabel("事件标签（必填）").fill("人工事件 A");
  await page.getByLabel("重复序号（可选）").fill("1");
  await page.getByLabel("阶段标签（可选）").fill("自定义阶段");
  await page.getByLabel("参考关节（可选）").selectOption("left_knee");
  await page.getByLabel("人工参考角度（可选，度）").fill("90");
  await page.getByRole("button", { name: "标记当前时刻" }).click();
  await expect(page.getByRole("cell", { name: "人工事件 A" })).toBeVisible();
  await expect(page.locator(".angle-time-annotation")).toHaveCount(1);
  await page.getByLabel(/曲线时间定位/).fill("0");
  await page.getByRole("button", { name: "0.2 秒 · 人工事件 A" }).click();
  await expect(page.getByLabel(/曲线时间定位/)).toHaveValue("0.2");
  const [filledDownload] = await Promise.all([
    page.waitForEvent("download"), page.getByRole("button", { name: "导出已标注 CSV" }).click(),
  ]);
  const filledPath = (await filledDownload.path())!;
  const filledCsv = await readFile(filledPath, "utf8");
  expect(filledCsv).toContain("人工事件 A,1,自定义阶段,left_knee");
  expect(filledCsv).toContain("manual_reference_angle_deg,model_reference_angle_deg,absolute_angle_difference_deg");
  const filledRow = filledCsv.split("\n").find((row) => row.includes("人工事件 A"));
  expect(filledRow).toBeDefined();
  const filledCells = filledRow!.split(",");
  expect(filledCells[5]).toBe("90.0");
  expect(Number.isFinite(Number(filledCells[6]))).toBe(true);
  expect(Number.isFinite(Number(filledCells[7]))).toBe(true);
  expect(filledCsv).not.toContain("synthetic-pose.webm");

  await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();
  const [summaryDownload] = await Promise.all([
    page.waitForEvent("download"), page.getByRole("button", { name: "导出角度对照摘要 JSON" }).click(),
  ]);
  const comparison = JSON.parse(await readFile((await summaryDownload.path())!, "utf8")) as {
    schema_version: string;
    summary: { overall: { count: number; meanAbsoluteDifferenceDeg: number | null } };
  };
  expect(comparison.schema_version).toBe("pose-comparison-summary-v1");
  expect(comparison.summary.overall.count).toBe(1);
  expect(typeof comparison.summary.overall.meanAbsoluteDifferenceDeg).toBe("number");
  const comparisonText = JSON.stringify(comparison);
  expect(comparisonText).not.toContain("人工事件 A");
  expect(comparisonText).not.toContain("synthetic-pose.webm");
  await expect(page.getByLabel(/导入已标注 CSV/)).toBeDisabled();
  await page.getByRole("button", { name: "删除" }).click();
  await expect(page.locator(".angle-time-annotation")).toHaveCount(0);
  await expect(page.getByLabel(/导入已标注 CSV/)).toBeEnabled();
  await page.getByLabel(/导入已标注 CSV/).setInputFiles(filledPath);
  await expect(page.getByLabel("待导入标注预览")).toContainText("1 条");
  await expect(page.getByRole("cell", { name: "人工事件 A" })).toHaveCount(0);
  await expect(page.locator(".angle-time-annotation")).toHaveCount(0);
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByText(/已在本标签页导入 1 条人工标注/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "人工事件 A" })).toBeVisible();
  await expect(page.locator(".angle-time-annotation")).toHaveCount(1);
  await page.getByRole("button", { name: "编辑" }).click();
  await expect(page.getByRole("button", { name: "保存标注修改" })).toBeVisible();
  await page.getByLabel("事件标签（必填）").fill("人工事件 B");
  await page.getByRole("button", { name: "保存标注修改" }).click();
  await expect(page.getByRole("cell", { name: "人工事件 A" })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "人工事件 B" })).toBeVisible();
  await expect(page.locator(".angle-time-annotation")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "0.2 秒 · 人工事件 B" })).toBeVisible();
});
