import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("patient browser test requires synthetic E2E_PASSWORD");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("button", {
    name: email === "demo-patient@example.org" ? "患者演示账号" : "工作人员演示账号",
  }).click();
  await expect(page.getByLabel("邮箱")).toHaveValue(email);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
}

test("synthetic patient sees only own portal and loses access after binding revocation", async ({ page, browser }) => {
  await login(page, "demo-patient@example.org");
  await expect(page.getByRole("heading", { name: "我的康复空间" })).toBeVisible();
  await expect(page.getByText("当前账号：demo-patient@example.org（患者）")).toBeVisible();
  await expect(page.getByText("我的演示编号：SYN-001")).toBeVisible();
  await expect(page.getByText("目前没有经医护确认并发布给此账号的计划或视频。")).toBeVisible();
  const camera = page.getByRole("region", { name: "实时摄像头骨架验证" });
  await expect(camera).toHaveCount(0);
  await expect(page.getByRole("button", { name: "重新检查记录" })).toHaveCount(0);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/patient$/);
  const forbidden = await page.evaluate(async () => (await fetch("/api/v1/participants")).status);
  expect(forbidden).toBe(403);

  const staffContext = await browser.newContext({ timezoneId: "Pacific/Honolulu" });
  try {
    const staffPage = await staffContext.newPage();
    await login(staffPage, "demo-clinician-a@example.org");
    await expect(staffPage.getByRole("heading", { name: "研究工作台" })).toBeVisible();
    const id = await staffPage.evaluate(async () => {
      const participants = await (await fetch("/api/v1/participants")).json() as { id: string; study_code: string }[];
      const id = participants.find((item) => item.study_code === "SYN-001")?.id;
      const csrf = document.cookie.split("; ").find((item) => item.startsWith("taiji_csrf="))?.split("=")[1];
      if (!id || !csrf) throw new Error("synthetic clinician has no participant or CSRF token");
      const consent = await fetch(`/api/v1/participants/${id}/consents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", "X-CSRF-Token": decodeURIComponent(csrf),
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          document_version: "SYN-DEMO-V1", purpose_code: "SYN-DEMO-PATIENT",
          decision: "granted", photo_scope: false,
        }),
      });
      if (consent.status !== 201) throw new Error(`synthetic consent failed: ${consent.status}`);
      return id;
    });
    await staffPage.goto(`/participants/${id}`);
    const shortcuts = staffPage.getByRole("navigation", { name: "患者端流程快捷入口" });
    await shortcuts.getByRole("link", { name: "前往患者端发布" }).click();
    await expect(staffPage.getByRole("heading", { name: "患者端合成发布流程" })).toBeFocused();
    await expect(staffPage.getByText("视频待提供和核对。现在发布的测试卡片只包含文字。")).toBeVisible();
    await expect(staffPage.getByText(/当前模拟同意：已记录，可用于合成发布/)).toBeVisible();
    await expect(staffPage.getByText(/合成患者绑定：有效/)).toBeVisible();
    const cardChoice = staffPage.getByLabel("选择演示卡片");
    const cardPreview = staffPage.getByRole("region", { name: "患者端卡片预览" });
    const confirmCard = staffPage.getByRole("checkbox", { name: /确认本次选择/ });
    await expect(cardPreview).toHaveCount(0);
    await cardChoice.selectOption("SYN-CARD-A");
    await expect(cardPreview).toContainText("演示卡片 A · 初次查看");
    await confirmCard.check();
    await cardChoice.selectOption("SYN-CARD-B");
    await expect(confirmCard).not.toBeChecked();
    await expect(cardPreview).toContainText("接收档案：SYN-001");
    await expect(cardPreview).toContainText("演示卡片 B · 后续查看");
    const previewMessage = await cardPreview.locator("p").last().innerText();
    expect(previewMessage).toBe("合成发布流程测试卡片；没有可执行的训练计划。");
    await confirmCard.check();
    await staffPage.getByRole("checkbox", { name: /合成流程测试/ }).check();
    const publicationEndpoint = "**/api/v1/participants/*/demo-patient-publications";
    await staffPage.route(publicationEndpoint, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.fulfill({ status: 503, json: {} });
    }, { times: 1 });
    await staffPage.getByRole("button", { name: "发布所选测试卡片" }).click();
    const publicationSection = staffPage.getByRole("region", { name: "患者端合成发布流程" });
    await expect(publicationSection.getByRole("alert")).toContainText("暂时无法确认操作结果");
    await expect(cardChoice).toBeDisabled();
    await expect(staffPage.getByRole("button", { name: "撤回测试卡片" })).toBeDisabled();
    await staffPage.getByRole("button", { name: "重试本次发布" }).click();
    await expect(staffPage.getByText(/合成卡片已发布/)).toBeVisible();
    const published = await staffPage.request.get(`/api/v1/participants/${id}/demo-patient-publications`);
    expect(await published.json()).toMatchObject([{ version: 1, state: "published", card_code: "SYN-CARD-B" }]);
    await page.reload();
    await expect(page.getByText(/合成流程测试版本 1/)).toBeVisible();
    await expect(page.getByText("当前卡片：演示卡片 B · 后续查看")).toBeVisible();
    await expect(page.getByText("视频待添加")).toBeVisible();
    await expect(page.getByText("当前卡片暂无可播放视频。")).toBeVisible();
    const plan = page.getByRole("region", { name: "训练计划与视频" });
    await expect(plan).toBeVisible();
    await expect(plan.getByText(previewMessage, { exact: true })).toBeVisible();
    await expect(plan.locator("video")).toHaveCount(0);
    await expect(camera).toBeVisible();
    const preview = camera.getByRole("button", { name: "开启摄像头预览" });
    await expect(preview).toBeDisabled();
    await camera.getByRole("checkbox").check();
    await expect(preview).toBeEnabled();
    async function mockCamera(denyFirst = false) {
      await page.evaluate((denyFirst) => {
        let denied = false;
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          configurable: true, value: async () => {
            if (denyFirst && !denied) {
              denied = true;
              throw new DOMException("Denied", "NotAllowedError");
            }
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d")!;
            const stream = canvas.captureStream(10);
            const draw = () => context.fillRect(0, 0, canvas.width, canvas.height);
            draw();
            const timer = window.setInterval(draw, 100);
            const track = stream.getVideoTracks()[0];
            const stop = track.stop.bind(track);
            track.stop = () => { window.clearInterval(timer); stop(); };
            return stream;
          },
        });
      }, denyFirst);
    }
    await mockCamera();
    await preview.click();
    await expect(camera.getByRole("status")).toContainText("摄像头预览已开启");
    const track = await camera.locator("video").evaluateHandle((video: HTMLVideoElement) =>
      (video.srcObject as MediaStream).getVideoTracks()[0],
    );
    const pauseTask = camera.getByRole("button", { name: "暂停演示任务" });
    await expect(pauseTask).toBeDisabled();
    await camera.getByRole("button", { name: "开始演示任务" }).click();
    await expect(camera.getByRole("status")).toHaveText(/实时骨架识别中|部分关键点不可见/, { timeout: 25_000 });
    await pauseTask.click();
    await expect(camera.getByRole("status")).toContainText("识别已暂停");
    expect(await track.evaluate((item) => item.readyState)).toBe("live");
    await camera.getByRole("button", { name: "继续演示任务" }).click();
    await expect(camera.getByRole("status")).toHaveText(/实时骨架识别中|部分关键点不可见/);
    await camera.getByRole("button", { name: "结束演示任务并填写记录" }).click();
    await expect(page.getByRole("heading", { name: "训练与不适记录" })).toBeFocused();
    await expect(camera.getByRole("status")).toHaveText("演示任务已结束，摄像头已停止。");
    expect(await track.evaluate((item) => item.readyState)).toBe("ended");
    await track.dispose();
    await expect(page.getByLabel("实际训练情况")).toHaveValue("unknown");
    await page.getByLabel("将本次反馈关联到演示任务版本 1").check();
    const sharePose = page.getByRole("checkbox", { name: /一并提交本次姿态识别摘要/ });
    await expect(sharePose).not.toBeChecked();
    await sharePose.check();
    await expect(page.getByText("尚未填写训练或不适记录；训练与不适状态均未知。")).toBeVisible();
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-05T10:00");
    await page.getByLabel("实际训练情况").selectOption("performed");
    await page.getByLabel("实际时长（分钟，可留空表示未知）").fill("12");
    await page.getByLabel("不适情况").selectOption("reported");
    await page.getByLabel("不适描述").fill("合成演示不适描述");
    await page.getByRole("button", { name: "保存记录" }).click();
    await expect(page.getByText(/合成记录已保存/)).toBeVisible();
    await expect(page.getByText("当前版本 1", { exact: true }).locator("..")).toBeFocused();
    await staffPage.reload();
    await shortcuts.getByRole("link", { name: "查看患者自报" }).click();
    await expect(staffPage.getByRole("heading", { name: "患者自报训练与不适" })).toBeFocused();
    await expect(staffPage.getByText(/合成演示不适描述/)).toBeVisible();
    const staffReports = staffPage.locator('section[aria-labelledby="patient-reports-heading"]');
    const staffCurrent = staffReports.locator(":scope > ul > li");
    const onlyDiscomfort = staffReports.getByLabel("仅显示当前版本自报有不适");
    await onlyDiscomfort.check();
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("演示任务版本 1");
    await expect(staffCurrent.first()).toContainText(/姿态识别摘要：采样 [1-9]\d* 次，检出人体 0 次，取景检查通过 0 次/);
    await onlyDiscomfort.uncheck();
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("发生时间（北京时间）");
    await expect(staffCurrent.first().locator("time").first()).toContainText("10:00");
    await expect(staffCurrent.first()).toContainText("保存时间（北京时间）");
    const firstReview = staffCurrent.first().getByRole("region", { name: "反馈人工复核" });
    const onlyPending = staffReports.getByRole("checkbox", { name: "仅显示待复核的任务反馈" });
    await onlyPending.check();
    await expect(staffCurrent).toHaveCount(1);
    await firstReview.getByLabel("复核结果").selectOption("unable");
    await firstReview.getByLabel(/复核备注/).fill("SYN-仅有计数，无法判定动作质量");
    await firstReview.getByRole("button", { name: "保存复核" }).click();
    await expect(staffReports.getByRole("status")).toHaveText("复核已保存，此条反馈已移出待复核列表。");
    await expect(staffCurrent).toHaveCount(0);
    await expect(onlyPending).toBeFocused();
    await onlyPending.uncheck();
    await expect(firstReview).toContainText("本版复核：无法判定");
    await staffPage.reload();
    await onlyPending.check();
    await expect(staffCurrent).toHaveCount(0);
    await onlyPending.uncheck();
    await expect(firstReview).toContainText("本版复核：无法判定");
    await firstReview.getByLabel("复核结果").selectOption("reviewed");
    await firstReview.getByLabel(/复核备注/).fill("SYN-已核对原始计数，非临床判断");
    await firstReview.getByRole("button", { name: "保存复核" }).click();
    await expect(firstReview.getByRole("status")).toContainText("复核已保存");
    await expect(firstReview.locator("ol > li")).toHaveCount(2);
    const observedTime = page.getByLabel("发生时间（北京时间）");
    await observedTime.fill("2026-11-05T11:00");
    await page.getByRole("button", { name: "更正", exact: true }).click();
    await expect(observedTime).toHaveValue("2026-11-05T10:00");
    await page.getByRole("button", { name: "取消更正" }).click();
    await expect(observedTime).toHaveValue("2026-11-05T11:00");
    await expect(page.getByText("当前版本 1")).toHaveCount(1);
    await page.getByRole("button", { name: "更正" }).click();
    await expect(page.getByLabel("发生时间（北京时间）")).toHaveValue("2026-11-05T10:00");
    await page.getByLabel("不适情况").selectOption("none");
    await page.getByLabel("更正原因（以 SYN- 开头）").fill("SYN-SELF-CORRECTION");
    await page.getByRole("button", { name: "保存更正" }).click();
    await expect(page.getByText(/版本 2/)).toBeVisible();
    await expect(page.getByText("当前版本 2", { exact: true }).locator("..")).toBeFocused();
    await page.reload();
    await expect(page.getByText(/版本 2/)).toBeVisible();
    const previousReport = page.locator("details").filter({ hasText: "查看旧版本" });
    await previousReport.locator("summary").click();
    await expect(previousReport).toContainText("旧版本 1");
    await expect(previousReport).toContainText("12 分钟");
    await expect(previousReport).toContainText("自报有不适");
    await expect(previousReport).toContainText("合成演示不适描述");
    await staffPage.reload();
    await expect(staffPage.getByText(/更正原因：SYN-SELF-CORRECTION/)).toBeVisible();
    await onlyDiscomfort.check();
    await expect(staffReports.getByRole("status")).toHaveText("没有当前版本自报有不适的记录。");
    await expect(staffCurrent).toHaveCount(0);
    await onlyDiscomfort.uncheck();
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("当前版本 2");
    await onlyPending.check();
    await expect(staffCurrent).toHaveCount(1);
    await onlyPending.uncheck();
    await expect(staffCurrent.first()).toContainText("演示任务版本 1");
    await expect(staffCurrent.first()).toContainText("姿态识别摘要");
    await expect(staffCurrent.first()).toContainText("保存时间（北京时间）");
    await staffCurrent.first().locator("summary").click();
    await expect(staffCurrent.first().locator(":scope > section")).toContainText("本版反馈待复核");
    const oldStaffReport = staffCurrent.first().locator(":scope > details > ul > li");
    await expect(oldStaffReport).toHaveCount(1);
    await expect(oldStaffReport).toContainText("旧版本 1");
    await expect(oldStaffReport).toContainText("合成演示不适描述");
    await expect(oldStaffReport).toContainText("SYN-已核对原始计数，非临床判断");
    await expect(oldStaffReport.getByRole("button", { name: "保存复核" })).toHaveCount(0);
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-04T00:15");
    await page.getByLabel("实际训练情况").selectOption("not_performed");
    await page.getByLabel("不适情况").selectOption("none");
    await page.getByRole("button", { name: "保存记录" }).click();
    const patientCurrent = page.locator('section[aria-labelledby="patient-report-heading"] > ul > li');
    await expect(patientCurrent).toHaveCount(2);
    await expect(patientCurrent.first()).toContainText("自报未训练");
    await expect(patientCurrent.first().locator(":scope > p")).toBeFocused();
    await expect(patientCurrent.nth(1)).toContainText("当前版本 2");
    await page.reload();
    await expect(patientCurrent.first()).toContainText("自报未训练");
    await expect(patientCurrent.nth(1)).toContainText("当前版本 2");
    await staffPage.reload();
    await expect(staffCurrent).toHaveCount(2);
    await expect(staffCurrent.first()).toContainText("自报未训练");
    const reportDate = staffReports.getByLabel("发生日期（北京时间）");
    await reportDate.fill("2026-11-04");
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("00:15");
    await onlyDiscomfort.check();
    await expect(staffReports.getByRole("status")).toHaveText("所选日期没有符合筛选条件的记录。");
    await onlyDiscomfort.uncheck();
    await reportDate.fill("2026-11-05");
    await expect(staffCurrent.first()).toContainText("当前版本 2");
    await staffReports.getByRole("button", { name: "清除日期" }).click();
    await expect(staffCurrent).toHaveCount(2);
    await staffPage.getByRole("link", { name: "核对版本 1 的反馈" }).click();
    await expect(staffReports.getByText(/正在核对演示任务版本 1/)).toBeVisible();
    await expect(staffCurrent).toHaveCount(1);
    await expect(staffCurrent.first()).toContainText("姿态识别摘要");
    await staffReports.getByRole("link", { name: "查看全部自报记录" }).click();
    await expect(staffCurrent).toHaveCount(2);
    const [download] = await Promise.all([
      staffPage.waitForEvent("download"),
      staffPage.getByRole("link", { name: "下载编号化 CSV" }).click(),
    ]);
    const csv = await readFile((await download.path())!, "utf8");
    expect(csv).toContain("patient_report_revision");
    expect(csv).toContain("patient_self_report");
    expect(csv).not.toContain("合成演示不适描述");
    expect(csv).not.toContain("SYN-SELF-CORRECTION");
    expect(csv).not.toContain("SYN-已核对原始计数");
    await mockCamera(true);
    await camera.getByRole("checkbox").check();
    await preview.click();
    await expect(camera.getByRole("status")).toContainText("摄像头权限被拒绝");
    const skipCamera = camera.getByRole("button", { name: "跳过摄像头并填写记录" });
    await skipCamera.click();
    await expect(page.getByRole("heading", { name: "训练与不适记录" })).toBeFocused();

    const modelAsset = "**/pose-assets/pose_landmarker_full.task";
    await page.route(modelAsset, (route) => route.abort());
    await preview.click();
    await expect(camera.getByRole("status")).toContainText("摄像头预览已开启");
    await camera.getByRole("button", { name: "开始演示任务" }).click();
    await expect(camera.getByRole("status")).toContainText("无法加载识别模型", { timeout: 15_000 });
    await page.unroute(modelAsset);
    await skipCamera.click();
    await expect(page.getByRole("heading", { name: "训练与不适记录" })).toBeFocused();
    await page.getByLabel("将本次反馈关联到演示任务版本 1").check();
    await expect(sharePose).toHaveCount(0);
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-05T12:00");
    await page.getByRole("button", { name: "保存记录" }).click();
    await expect(patientCurrent).toHaveCount(3);
    await staffPage.getByRole("link", { name: "核对版本 1 的反馈" }).click();
    await expect(staffCurrent).toHaveCount(2);
    await expect(staffCurrent.first()).toContainText("未提交姿态摘要");
    await staffPage.getByRole("checkbox", { name: /合成流程测试/ }).check();
    await staffPage.getByRole("button", { name: "撤回测试卡片" }).click();
    await expect(staffPage.getByText(/版本 2 · 撤回/)).toBeVisible();
    await page.getByLabel("将本次反馈关联到演示任务版本 1").check();
    await page.getByLabel("发生时间（北京时间）").fill("2026-11-05T12:00");
    await page.getByRole("button", { name: "保存记录" }).click();
    await expect(page.getByRole("status", { name: "" }).filter({
      hasText: "演示任务或记录状态已变化，请刷新后重试。",
    })).toBeVisible();
    await page.reload();
    await expect(patientCurrent).toHaveCount(3);
    await expect(page.getByText("目前没有经医护确认并发布给此账号的计划或视频。")).toBeVisible();
    await expect(camera).toHaveCount(0);
    const revokeStatus = await staffPage.evaluate(async (participantId) => {
      const csrf = document.cookie.split("; ").find((item) => item.startsWith("taiji_csrf="))?.split("=")[1];
      if (!csrf) throw new Error("synthetic clinician has no CSRF token");
      return (await fetch(`/api/v1/participants/${participantId}/demo-patient-binding/revoke`, {
        method: "POST", headers: { "X-CSRF-Token": decodeURIComponent(csrf) },
      })).status;
    }, id);
    expect(revokeStatus).toBe(204);
  } finally {
    await staffContext.close();
  }
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "demo-patient@example.org");
  await expect(page.getByRole("heading", { name: "演示编号不可用" })).toBeVisible();
  await expect(page.getByText("此患者账号当前没有有效的演示编号绑定，可能尚未绑定或绑定已撤销。")).toBeVisible();
  await page.getByRole("button", { name: "重新检查绑定" }).click();
  await expect(page.getByRole("heading", { name: "演示编号不可用" })).toBeVisible();
});
