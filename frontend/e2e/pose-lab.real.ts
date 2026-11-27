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
  const poseAssetRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`);
    if (new URL(request.url()).pathname.startsWith("/pose-assets/")) poseAssetRequests.push(request.url());
  });
  await page.getByRole("checkbox", { name: /我确认这是合成视频/ }).check();
  const originalMode = page.getByRole("checkbox", { name: "仅看原视频" });
  await originalMode.check();
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
  await expect(page.getByRole("button", { name: "开始本地分析" })).toBeDisabled();
  await expect(page.getByLabel("识别到的人体骨架叠加层")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "3. 技术测量结果" })).toHaveCount(0);
  await page.getByLabel(/原视频时间定位/).fill("0.4");
  await expect(page.getByText("当前视频时刻：0.4 秒")).toBeVisible();
  const timing = page.getByRole("region", { name: "五次坐站计时复核" });
  const confirmTiming = timing.getByRole("button", { name: "确认本次计时记录" });
  const exportTiming = timing.getByRole("button", { name: "导出计时复核 CSV" });
  await expect(confirmTiming).toBeDisabled();
  await timing.getByRole("button", { name: "标记计时起点" }).click();
  await page.getByLabel(/原视频时间定位/).fill("0.8");
  await timing.getByRole("button", { name: "标记第五次站直" }).click();
  await expect(timing.getByText("0.40 秒", { exact: true }).last()).toBeVisible();
  await confirmTiming.click();
  const [timingDownload] = await Promise.all([page.waitForEvent("download"), exportTiming.click()]);
  expect(await readFile((await timingDownload.path())!, "utf8")).toContain("\nreviewed,,400,800,400,,,");
  await page.getByLabel(/原视频时间定位/).fill("0.4");
  await page.getByLabel("事件标签（必填）").fill("仅看原视频核对点");
  await page.getByRole("button", { name: "标记当前时刻" }).click();
  const [manualDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出已标注 CSV" }).click(),
  ]);
  expect(await readFile((await manualDownload.path())!, "utf8")).toContain("400.0,仅看原视频核对点");
  expect(poseAssetRequests).toEqual([]);
  await originalMode.uncheck();
  await page.getByRole("button", { name: "开始本地分析" }).click();
  await expect(page.getByText(/分析完成：/)).toBeVisible({ timeout: 60_000 });
  await expect(originalMode).toBeDisabled();
  await expect(exportTiming).toBeEnabled();
  await expect(page.getByRole("cell", { name: "仅看原视频核对点" })).toBeVisible();
  await expect(page.getByRole("button", { name: /0.4 秒 · 仅看原视频核对点/ })).toBeVisible();
  await page.getByRole("row").filter({ hasText: "仅看原视频核对点" })
    .getByRole("button", { name: "删除" }).click();
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
  const positionedTime = await page.locator("video[controls]").evaluate((video) => (video as HTMLVideoElement).currentTime);
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
  await page.locator("#pose-video").evaluate((element) => {
    const input = element as HTMLInputElement;
    const replacement = new DataTransfer();
    replacement.items.add(new File([input.files![0]], "replacement.webm", { type: "video/webm" }));
    Object.defineProperty(input, "files", { configurable: true, value: replacement.files });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(timing).toBeVisible();
  await expect(exportTiming).toBeDisabled();
  await expect(timing.getByText("未标记", { exact: true })).toHaveCount(2);
  await timing.getByLabel("无法判定的原因").selectOption("start_unverifiable");
  await confirmTiming.click();
  const [unknownDownload] = await Promise.all([page.waitForEvent("download"), exportTiming.click()]);
  expect(await readFile((await unknownDownload.path())!, "utf8")).toContain("\nunavailable,start_unverifiable,,,,,,");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 768;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(10);
    const draw = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    draw();
    const timer = window.setInterval(draw, 100);
    const track = stream.getVideoTracks()[0];
    const stop = track.stop.bind(track);
    track.stop = () => { window.clearInterval(timer); stop(); };
    let requests = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async (constraints: MediaStreamConstraints) => {
        const video = constraints.video;
        if (typeof video === "object" && video.facingMode &&
            typeof video.facingMode === "object" && "exact" in video.facingMode &&
            video.facingMode.exact === "environment" && constraints.audio === false) {
          throw new DOMException("No rear camera", "OverconstrainedError");
        }
        requests++;
        if (requests === 1) throw new DOMException("Denied", "NotAllowedError");
        if (requests === 2) {
          const lateTrack = track.clone();
          window.addEventListener("test-camera-permission-granted", () => {
            window.dispatchEvent(new CustomEvent("test-camera-track", { detail: lateTrack }));
          }, { once: true });
          return new Promise<MediaStream>((resolve) => {
            window.addEventListener("test-camera-track", () => resolve(new MediaStream([lateTrack])), { once: true });
          });
        }
        return stream;
      },
    });
  }, dataUrl);
  const camera = page.getByRole("region", { name: "实时摄像头骨架验证" });
  const startCamera = camera.getByRole("button", { name: "开启摄像头预览" });
  const startAnalysis = camera.getByRole("button", { name: "开始识别", exact: true });
  await expect(startCamera).toBeDisabled();
  await expect(startAnalysis).toBeDisabled();
  await camera.getByRole("checkbox").check();
  const modelRequestsBeforePreview = poseAssetRequests.length;
  const stopCamera = camera.getByRole("button", { name: "停止摄像头" });
  const status = camera.getByRole("status");
  await startCamera.click();
  await expect(status).toContainText("摄像头权限被拒绝");
  await expect(startCamera).toBeEnabled();
  await startCamera.click();
  await expect(status).toContainText("正在请求摄像头权限");
  await stopCamera.click();
  const lateTrack = await page.evaluateHandle(() => {
    const track = new Promise<MediaStreamTrack>((resolve) => {
      window.addEventListener("test-camera-track", (event) => resolve((event as CustomEvent<MediaStreamTrack>).detail), { once: true });
    });
    window.dispatchEvent(new Event("test-camera-permission-granted"));
    return track;
  });
  await expect.poll(() => lateTrack.evaluate((track) => track.readyState)).toBe("ended");
  await lateTrack.dispose();
  await expect(status).toHaveText("摄像头已停止。");
  expect(await camera.locator("video").evaluate((video: HTMLVideoElement) => video.srcObject === null)).toBe(true);
  await expect(camera.getByRole("button", { name: "导出实时分析摘要" })).toHaveCount(0);
  const cameraChoice = camera.getByLabel("摄像头选择");
  await cameraChoice.selectOption("rear");
  await startCamera.click();
  await expect(status).toContainText("当前设备无法使用后置摄像头");
  await cameraChoice.selectOption("default");
  await startCamera.click();
  await expect(camera.getByRole("status")).toHaveText(/摄像头预览已开启/);
  await expect(cameraChoice).toBeDisabled();
  const preview = camera.getByLabel("摄像头预览");
  await expect.poll(() => preview.evaluate((video: HTMLVideoElement) => {
    const { width, height } = video.getBoundingClientRect();
    return height > width && width > 0 && width <= window.innerWidth;
  })).toBe(true);
  expect(poseAssetRequests).toHaveLength(modelRequestsBeforePreview);
  await startAnalysis.click();
  await expect(camera.getByRole("status")).toHaveText(/实时骨架识别中|部分关键点不可见/, { timeout: 30_000 });
  await expect.poll(() => camera.locator("canvas").evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data.some((value) => value > 0),
  )).toBe(true);
  const tracks = await camera.locator("video").evaluateHandle((video: HTMLVideoElement) =>
    (video.srcObject as MediaStream).getTracks(),
  );
  await stopCamera.click();
  await expect(camera.getByRole("status")).toHaveText("摄像头已停止。");
  expect(await tracks.evaluate((items) => items.map((track) => track.readyState))).toEqual(["ended"]);
  await tracks.dispose();
  const [cameraDownload] = await Promise.all([
    page.waitForEvent("download"),
    camera.getByRole("button", { name: "导出实时分析摘要" }).click(),
  ]);
  const cameraSummary = JSON.parse(await readFile((await cameraDownload.path())!, "utf8"));
  expect(cameraSummary).toMatchObject({
    schema_version: 1, source: "live_camera", angle_source: "model_estimate",
  });
  expect(cameraSummary.detected_count).toBeGreaterThan(0);
  expect(cameraSummary.sample_count).toBeGreaterThanOrEqual(cameraSummary.detected_count);
  expect(Object.values(cameraSummary.joint_ranges).length).toBeGreaterThan(0);
  expect(cameraSummary).not.toHaveProperty("frames");
  const review = page.getByRole("region", { name: "核对实时分析摘要" });
  const summaryInput = review.getByLabel("打开实时分析 JSON");
  await summaryInput.setInputFiles((await cameraDownload.path())!);
  await expect(review.getByRole("heading", { name: "已打开实时分析摘要" })).toBeVisible();
  await expect(review.getByText(`检出 ${cameraSummary.detected_count} / ${cameraSummary.sample_count} 次采样`, { exact: false })).toBeVisible();
  await expect(review.getByRole("table", { name: "各关节估算角度范围" })).toBeVisible();
  await summaryInput.setInputFiles({
    name: "invalid-summary.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...cameraSummary, detected_count: cameraSummary.sample_count + 1 })),
  });
  await expect(review.getByRole("alert")).toContainText("无法读取摘要");
  await expect(review.getByRole("table")).toHaveCount(0);
  expect(writes).toEqual([]);
});
