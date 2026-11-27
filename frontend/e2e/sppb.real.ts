import { expect, test, type Page } from "@playwright/test";

// Hand-built keypoints test HTTP persistence, not MediaPipe detection accuracy.
function syntheticTrial() {
  const frames = [];
  const phases = [0, 0, 0, .4, .7, 1, 1, 1, .7, .4, 0, 0];
  for (let cycle = 0; cycle < 5; cycle++) for (const p of phases) {
    const y = 300 - 80 * p;
    const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 0 }));
    const points: Record<number, [number, number]> = {
      11: [190, y - 100], 12: [210, y - 100], 23: [190, y], 24: [210, y],
      25: [300 - 100 * p, 300 + 20 * p], 26: [300 - 100 * p, 300 + 20 * p],
      27: [300 - 100 * p, 400 + 20 * p], 28: [300 - 100 * p, 400 + 20 * p],
      15: [210, y - 100], 16: [190, y - 100],
    };
    for (const [index, [x, pointY]] of Object.entries(points)) {
      landmarks[Number(index)] = { x: x / 640, y: pointY / 480, z: 0, visibility: 1 };
    }
    frames.push({ timestamp_ms: frames.length * 200, landmarks, pose_count: 1 });
  }
  return { source: "synthetic_video", model_version: "mediapipe-pose-lite-float16-v1",
    model_sha256: "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
    width: 640, height: 480, support: "unknown", frames };
}

async function request(page: Page, path: string, body?: object, key = crypto.randomUUID()) {
  return page.evaluate(async ({ path, body, key }) => {
    const csrf = document.cookie.split(";").map(x => x.trim()).find(x => x.startsWith("taiji_csrf="))?.split("=")[1];
    try {
      const response = await fetch(`/api/v1${path}`, body ? {
        method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf ?? "", "Idempotency-Key": key },
        body: JSON.stringify(body),
      } : {});
      return { status: response.status, value: await response.json() };
    } catch { return { status: 503, value: null }; }
  }, { path, body, key });
}

test("saved pose yields durable SPPB candidate and append-only human timing through actual browser HTTP", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("demo-clinician-a@example.org");
  await page.getByLabel("密码").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByLabel("合成编号").fill("SYN-SPPB-HTTP-001");
  await page.getByLabel("明确记录模拟同意（仅合成数据）").check();
  await page.getByRole("button", { name: "创建编号对象" }).click();
  await expect(page).toHaveURL(/\/participants\/[^/]+$/);
  const participantId = new URL(page.url()).pathname.split("/").at(-1)!;
  const pose = await request(page, `/participants/${participantId}/pose-analyses`, syntheticTrial());
  expect(pose.status).toBe(201);
  const path = `/participants/${participantId}/sppb-measurements`;
  const payload = { source_analysis_id: pose.value.id, manual_start_ms: 0 };
  const key = crypto.randomUUID();
  // A real successful server commit with a lost browser response.
  let drop = true;
  await page.route("**/api/v1/participants/*/sppb-measurements", async route => {
    if (route.request().method() === "POST" && drop) {
      drop = false;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort("failed");
    } else await route.continue();
  });
  expect((await request(page, path, payload, key)).status).toBe(503);
  const saved = await request(page, path, payload, key);
  expect(saved.status).toBe(201);
  expect(saved.value.result.elapsed_seconds).toBe(10.6);
  expect(saved.value.result.sppb_score).toBeNull();
  expect((await request(page, path)).value.total).toBe(1);
  const detailPath = `/sppb-measurements/${saved.value.id}`;
  const review = { expected_revision: 0, decision: "modified_timing", start_ms: 0,
    fifth_stand_ms: 10000, reason: "浏览器合成起止复核" };
  const reviewKey = crypto.randomUUID();
  const confirmed = await request(page, `${detailPath}/reviews`, review, reviewKey);
  expect(confirmed.status).toBe(201);
  expect((await request(page, `${detailPath}/reviews`, review, reviewKey)).value.id).toBe(confirmed.value.id);
  expect((await request(page, `${detailPath}/reviews`, review)).status).toBe(409);
  await page.reload();
  const reloaded = await request(page, detailPath);
  expect(reloaded.value.result).toEqual(saved.value.result);
  expect(reloaded.value.human_confirmation).toMatchObject({ evidence_type: "HUMAN_CONFIRMATION",
    start_ms: 0, elapsed_seconds: 10, revision_no: 1 });
  expect(reloaded.value.reviews).toHaveLength(1);
  expect((await request(page, `/pose-analyses/${pose.value.id}`)).value.result).toEqual(pose.value.result);
  const retake = await request(page, `${detailPath}/reviews`, { expected_revision: 1,
    decision: "needs_retake", reason: "保留旧版并请求重测" });
  expect(retake.status).toBe(201);
  const current = await request(page, detailPath);
  expect(current.value.human_confirmation).toBeNull();
  expect(current.value.reviews).toHaveLength(2);
  expect((await request(page, `${path}?offset=1&limit=1`)).value.items).toEqual([]);

  // Product UI: select the saved skeleton, specify a genuine zero start, retry a
  // lost response, review, and reopen. All data still comes from actual PG APIs.
  await page.goto(`/participants/${participantId}/ai-assessment`);
  await page.getByRole("button", { name: /有测量指标 · 打开/ }).click();
  const panel = page.getByRole("region", { name: "4. 五次坐站候选测量" });
  await panel.getByLabel("指定人工起点").check();
  await panel.getByLabel("人工起点（秒）").fill("0");
  drop = true;
  await panel.getByRole("button", { name: "生成坐站候选测量" }).click();
  await expect(panel.getByRole("alert")).toContainText("提交结果暂无法确认");
  await expect(panel.getByLabel("人工起点（秒）")).toHaveValue("0");
  const uiSavedResponse = page.waitForResponse(response => response.url().endsWith("/sppb-measurements") && response.request().method() === "POST");
  await panel.getByRole("button", { name: "生成坐站候选测量" }).click();
  const uiSaved = await (await uiSavedResponse).json();
  await expect(panel.getByText(/共 2 条/)).toBeVisible();
  await panel.getByLabel("坐站复核结论").selectOption("modified_timing");
  await panel.getByLabel("修正起点（秒）").fill("0");
  await panel.getByLabel("第五次站起时刻（秒）").fill("10");
  await panel.getByLabel("坐站复核说明").fill("网页核对起点和第五次站起");
  await panel.getByRole("button", { name: "保存坐站人工复核" }).click();
  await expect(panel.getByText("人工版本 1")).toBeVisible();
  const values = panel.getByRole("region", { name: "当前坐站测量" });
  await expect(values.getByText("10.6 秒", { exact: true })).toBeVisible();
  await expect(values.getByText("10 秒", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${process.env.E2E_OUTPUT_DIR}/sppb-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const button of await panel.getByRole("button").all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect((await panel.locator("label.check").boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${process.env.E2E_OUTPUT_DIR}/sppb-mobile.png`, fullPage: true });
  await page.reload();
  await panel.getByRole("button", { name: "打开坐站测量" }).first().click();
  await expect(panel.getByText("人工版本 1")).toBeVisible();
  await expect(panel.getByLabel("修正起点（秒）")).toHaveValue("0");
  // Another reviewer saves while this screen remains on revision 1.
  expect((await request(page, `/sppb-measurements/${uiSaved.id}/reviews`, { expected_revision: 1,
    decision: "needs_retake", reason: "另一复核者要求重测" })).status).toBe(201);
  await panel.getByLabel("坐站复核说明").fill("保留当前输入并核对冲突");
  await panel.getByRole("button", { name: "保存坐站人工复核" }).click();
  await expect(panel.getByRole("alert")).toContainText("记录版本已变化");
  await expect(panel.getByLabel("坐站复核说明")).toHaveValue("保留当前输入并核对冲突");
  await panel.getByRole("button", { name: "刷新坐站记录" }).click();
  await expect(panel.getByText("计时版本 2 · 要求重测")).toBeVisible();
  await expect(panel.getByText("尚无当前有效确认")).toBeVisible();
  for (let i = 0; i < 4; i++) expect((await request(page, path, payload)).status).toBe(201);
  await panel.getByRole("button", { name: "刷新坐站历史" }).click();
  await expect(panel.getByText(/共 6 条 · 当前 1–5/)).toBeVisible();
  await panel.getByRole("button", { name: "下一页坐站记录" }).click();
  await expect(panel.getByText(/共 6 条 · 当前 6–6/)).toBeVisible();
  await panel.getByRole("button", { name: "上一页坐站记录" }).click();
  await expect(panel.getByText(/共 6 条 · 当前 1–5/)).toBeVisible();
});
