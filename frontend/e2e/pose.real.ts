import { expect, test, type Page } from "@playwright/test";

async function createTask(page: Page, code: string) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("demo-clinician-a@example.org");
  await page.getByLabel("密码").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "研究工作台" })).toBeVisible();
  await page.getByLabel("合成编号").fill(code);
  await page.getByLabel("明确记录模拟同意（仅合成数据）").check();
  await page.getByRole("button", { name: "创建编号对象" }).click();
  await expect(page).toHaveURL(/\/participants\/[^/]+$/);
  // Checking consent on the create form records it immediately.
  await expect(page.getByText("当前记录：模拟同意已记录")).toBeVisible();
  await page.getByRole("link", { name: "AI视频动作评估" }).click();
  await expect(page.getByRole("heading", { name: "AI 视频动作评估" })).toBeVisible();
}

test("real pose model yields landmarks, persists evidence, and retains review after refresh", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await createTask(page, "SYN-POSE-BROWSER-001");
  // Actual model dispatch deliberately slower than the 200ms file sampling step.
  await page.evaluate(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: { type?: string }, transfer: Transferable[] | StructuredSerializeOptions = []) {
        const send = () => { if (Array.isArray(transfer)) super.postMessage(message, transfer); else super.postMessage(message, transfer); };
        if (message.type === "frame") setTimeout(send, 250); else send();
      }
    };
  });
  await page.getByLabel("任务姿势/辅助方式").selectOption("seated");
  await page.getByRole("button", { name: "加载合成样例" }).click();
  await expect(page.getByRole("button", { name: "开始AI识别并评估" })).toBeEnabled({ timeout: 15_000 });
  const savedRequest = page.waitForResponse(r => r.url().includes("/pose-analyses") && r.request().method() === "POST", { timeout: 90_000 });
  await page.getByRole("button", { name: "开始AI识别并评估" }).click();
  const response = await savedRequest;
  expect(response.status(), await response.text()).toBe(201);
  const summary = await response.json();
  expect(summary.result.single_pose_frames).toBeGreaterThanOrEqual(3);
  expect(summary.result.single_pose_frames / summary.result.sampled_frames).toBeGreaterThanOrEqual(.9);
  expect(summary.result.metrics.left_elbow.median_deg).not.toBeNull();
  expect(summary.result.clinical_score).toBeNull();
  await expect(page.getByRole("heading", { name: "2. AI 初评报告" })).toBeVisible();
  await expect(page.getByRole("img", { name: "已保存的骨架证据" })).toBeVisible();
  const detail = await page.request.get(`/api/v1/pose-analyses/${summary.id}`);
  const data = await detail.json();
  expect(data.input_data.frames[0].landmarks).toHaveLength(33);
  expect(data.input_data.support).toBe("seated");
  expect(summary.algorithm_version).toBe("pose-geometry-v3");
  expect(summary.result.posture.valid_frames).toBeGreaterThanOrEqual(3);
  expect(data.input_data.frames.map((frame: { timestamp_ms: number }) => frame.timestamp_ms))
    .toEqual(data.input_data.frames.map((_: unknown, index: number) => index * 200));
  await expect(page.getByRole("img", { name: "左肘原始和平滑角度曲线" })).toBeVisible();
  await page.getByLabel("复核说明").fill("合成样例：已核对骨架与观察指标，不作为临床评分。");
  await page.getByRole("button", { name: "保存人工复核" }).click();
  await expect(page.getByText(/版本1 · 确认观察指标/)).toBeVisible();
  await page.getByLabel("复核结论").selectOption("modified_observations");
  await page.getByRole("button", { name: "添加指标修正" }).click();
  await page.getByLabel("修正1人工值（度）").fill("0");
  await page.getByLabel("修正1理由").fill("合成逐项修正：保留真实零值");
  await page.getByRole("button", { name: "添加指标修正" }).click();
  await page.getByLabel("修正2指标").selectOption("range_p05_p95_deg");
  await page.getByLabel("修正2观测状态").selectOption("missing");
  await page.getByLabel("修正2理由").fill("合成遮挡：幅度无法判断");
  await page.getByLabel("复核说明").fill("复核角度与幅度，AI原值保留");
  await page.getByRole("button", { name: "保存人工复核" }).click();
  await expect(page.getByRole("heading", { name: "当前人工确认结果 · 版本2" })).toBeVisible();
  await expect(page.getByText(/左肘 · 角度中位数：AI .* → 人工复核 0°/)).toBeVisible();
  await expect(page.getByText(/左肘 · 活动幅度P5–P95：AI .* → 人工复核 未知/)).toBeVisible();
  const corrected = await (await page.request.get(`/api/v1/pose-analyses/${summary.id}`)).json();
  expect(corrected.result).toEqual(summary.result);
  expect(corrected.human_confirmation.metrics.left_elbow).toEqual({ median_deg: 0, range_p05_p95_deg: null });
  await page.screenshot({ path: `${process.env.E2E_OUTPUT_DIR}/pose-report.png`, fullPage: true });
  await page.reload();
  await page.getByRole("button", { name: /有测量指标/ }).click();
  await expect(page.getByText(/版本1 · 确认观察指标/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前人工确认结果 · 版本2" })).toBeVisible();
  await expect(page.getByLabel("修正1人工值（度）")).toHaveValue("0");
  const csrf = (await page.context().cookies()).find(cookie => cookie.name === "taiji_csrf")!.value;
  const otherWindow = await page.request.post(`/api/v1/pose-analyses/${summary.id}/reviews`, {
    headers: { "X-CSRF-Token": csrf, "Idempotency-Key": crypto.randomUUID() },
    data: { expected_revision: 2, decision: "needs_retake", reason: "另一页面要求重新取景" },
  });
  expect(otherWindow.status()).toBe(201);
  await page.getByLabel("复核说明").fill("旧页面尝试提交，不能覆盖新复核");
  await page.getByRole("button", { name: "保存人工复核" }).click();
  await expect(page.getByRole("status").first()).toContainText("复核记录已更新");
  await page.getByRole("button", { name: "刷新复核记录" }).click();
  await expect(page.getByText("当前没有已确认的观察结果。")).toBeVisible();
  await expect(page.getByText(/版本3 · 要求重录/)).toBeVisible();
  await expect(page.getByText(/版本2 · 修正后确认观察指标/)).toBeVisible();
  expect(errors).toEqual([]);
  await test.info().attach("pose-summary", { body: JSON.stringify(summary, null, 2), contentType: "application/json" });
});

test("lost save response retries captured evidence without duplicate records", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await createTask(page, "SYN-POSE-BROWSER-005");
  const keys: string[] = [], bodies: string[] = [];
  let first = true;
  await page.route("**/api/v1/participants/*/pose-analyses", async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    keys.push(route.request().headers()["idempotency-key"]);
    bodies.push(route.request().postData()!);
    if (first) {
      first = false;
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      await route.abort("connectionfailed");
    } else { await route.continue(); }
  });
  await page.getByRole("button", { name: "加载合成样例" }).click();
  await expect(page.getByRole("button", { name: "开始AI识别并评估" })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: "开始AI识别并评估" }).click();
  await expect(page.getByRole("button", { name: "重试保存本次分析" })).toBeEnabled({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "开始AI识别并评估" })).toBeDisabled();
  let failDetailOnce = true;
  await page.route("**/api/v1/pose-analyses/*", async route => {
    if (route.request().method() === "GET" && failDetailOnce) {
      failDetailOnce = false;
      await route.fulfill({ status: 503, body: "synthetic detail read outage" });
    } else { await route.continue(); }
  });
  await page.getByRole("button", { name: "重试保存本次分析" }).click();
  await expect(page.getByRole("status").first()).toContainText("记录已保存，报告详情暂不可用");
  await expect(page.getByRole("button", { name: "重试保存本次分析" })).toHaveCount(0);
  await page.getByRole("button", { name: /有测量指标/ }).click();
  await expect(page.getByRole("heading", { name: "2. AI 初评报告" })).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText("已打开已保存的评估记录");
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]); expect(bodies[0]).toBe(bodies[1]);
  await expect(page.getByRole("button", { name: /有测量指标/ })).toHaveCount(1);
  await page.getByLabel("查看关节曲线").selectOption("right_elbow");
  await expect(page.getByRole("img", { name: "右肘原始和平滑角度曲线" })).toBeVisible();
  const width = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, screen: innerWidth }));
  expect(width.body).toBeLessThanOrEqual(width.screen);
  await page.screenshot({ path: `${process.env.E2E_OUTPUT_DIR}/pose-mobile-retry.png`, fullPage: true });
  await page.reload();
  await expect(page.getByRole("button", { name: /有测量指标/ })).toHaveCount(1);
});

test("blank video produces unknown metrics and cannot be accepted as measured", async ({ page }) => {
  test.setTimeout(120_000);
  await createTask(page, "SYN-POSE-BROWSER-002");
  // Deliberately blank synthetic media, encoded by this browser and sent only to its own file input.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#777"; context.fillRect(0, 0, 640, 480);
    const media = canvas.captureStream(10), recorder = new MediaRecorder(media), chunks: Blob[] = [];
    const done = new Promise<Blob>(resolve => {
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
    });
    recorder.start();
    for (let i = 0; i < 25; i++) {
      context.fillRect(0, 0, 640, 480); await new Promise(resolve => setTimeout(resolve, 100));
    }
    recorder.stop(); const blob = await done;
    media.getTracks().forEach(t => t.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.getByLabel("选择合成测试视频").setInputFiles({ name: "synthetic-blank.webm", mimeType: "video/webm", buffer: Buffer.from(bytes) });
  await expect(page.getByRole("button", { name: "开始AI识别并评估" })).toBeEnabled();
  await page.getByRole("button", { name: "开始AI识别并评估" }).click();
  await expect(page.getByText("无法评估，请重新取景或交人工评估", { exact: false })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("cell", { name: "不可评估", exact: true })).toHaveCount(12);
  await page.getByLabel("复核说明").fill("空画面不能确认有效指标");
  await page.getByRole("button", { name: "保存人工复核" }).click();
  await expect(page.getByRole("status").first()).toContainText("不可评估的AI结果不能直接确认");
});

test("model loading failure and camera permission denial remain actionable", async ({ page }) => {
  await createTask(page, "SYN-POSE-BROWSER-003");
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("denied", "NotAllowedError"); };
  });
  await page.getByRole("button", { name: "打开测试摄像" }).click();
  await expect(page.getByRole("status").first()).toContainText("无法打开摄像头");
  await page.getByRole("button", { name: "加载合成样例" }).click();
  await expect(page.getByRole("button", { name: "开始AI识别并评估" })).toBeEnabled({ timeout: 15_000 });
  await page.route("**/pose-assets/manifest.json", route => route.fulfill({ status: 404 }));
  await page.getByRole("button", { name: "开始AI识别并评估" }).click();
  await expect(page.getByRole("status").first()).toContainText("本地模型资源缺失");
  await expect(page.getByRole("heading", { name: "2. AI 初评报告" })).toHaveCount(0);
});

test("synthetic camera stream runs real model and stop releases capture before saving", async ({ page }) => {
  test.setTimeout(90_000);
  await createTask(page, "SYN-POSE-BROWSER-004");
  // Replace only the hardware input with synthetic pixels; the Worker and inference stay real.
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const image = new Image(); image.src = "/pose-fixtures/synthetic-elderly.png"; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 656;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0, 600, 656);
      const stream = canvas.captureStream(10);
      const interval = setInterval(() => {
        if (stream.getVideoTracks()[0].readyState === "ended") clearInterval(interval);
        else context.drawImage(image, 0, 0, 600, 656);
      }, 100);
      return stream;
    };
  });
  await page.getByRole("button", { name: "打开测试摄像" }).click();
  await expect(page.getByRole("button", { name: "开始AI识别并评估" })).toBeEnabled();
  await page.getByRole("button", { name: "开始AI识别并评估" }).click();
  await expect(page.getByRole("status").first()).toContainText(/已识别33个关键点 · [5-9]\d*帧/, { timeout: 30_000 });
  await page.getByRole("button", { name: "停止并分析" }).click();
  await expect(page.getByRole("heading", { name: "2. AI 初评报告" })).toBeVisible();
  const cameraStopped = await page.locator("video").evaluate(el => {
    const stream = (el as HTMLVideoElement).srcObject as MediaStream;
    return stream.getVideoTracks().every(track => track.readyState === "ended");
  });
  expect(cameraStopped).toBe(true);
});
