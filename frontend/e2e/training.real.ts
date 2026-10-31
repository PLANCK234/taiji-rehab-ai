import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("REAL-01D0 requires a synthetic E2E password");

test("synthetic training observation, early event and revised feedback survive reload", async ({
  page, browser,
}) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("demo-clinician-a@example.org");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/workspace$/);

  const code = `SYN-REALD0-${Date.now().toString(36).toUpperCase()}`;
  await page.locator('input[name="study_code"]').fill(code);
  await page.locator('form:has(input[name="study_code"]) button[type="submit"]').click();
  await expect(page).toHaveURL(/\/participants\/[0-9a-f-]+$/);
  const participantPath = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: code })).toBeVisible();

  await page.locator('form:has(input[name="document_version"]) button[type="submit"]').click();
  await expect(page.locator('form:has(input[name="session_at"])')).toBeVisible();
  const training = page.locator('form:has(input[name="session_at"])');
  await training.locator('input[name="session_at"]').fill("2026-10-30T09:30");
  await training.locator('input[name="action_label"]').fill("合成测试已发生动作");
  await training.locator('input[name="actual_minutes"]').fill("0");
  await training.locator('select[name="completion_status"]').selectOption("interrupted");
  await training.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/training\/[0-9a-f-]+$/);
  const sessionPath = new URL(page.url()).pathname;
  await expect(page.getByText("未填写反馈；不能视为 RPE 0 或无不适。")).toBeVisible();

  // The event intake is usable before any feedback has been entered.
  await page.goto(participantPath);
  const eventForm = page.locator('form:has(input[name="event_at"])');
  await eventForm.locator('input[name="event_at"]').fill("2026-10-30T09:35");
  await eventForm.locator('select[name="session_id"]').selectOption({ index: 1 });
  await eventForm.locator('textarea[name="description"]').fill("合成测试事件：训练中断");
  await eventForm.locator('button[type="submit"]').click();
  await expect(page.getByText("合成测试事件：训练中断", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("合成测试事件：训练中断", { exact: false })).toBeVisible();

  await page.goto(sessionPath);
  const feedback = page.locator('form:has(select[name="state"])');
  await feedback.locator('select[name="state"]').selectOption("missing");
  await feedback.locator('select[name="missing_reason"]').selectOption("interrupted");
  await feedback.locator('button[type="submit"]').click();
  await expect(page.getByText("第 1 版", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("缺失：训练中断", { exact: false })).toBeVisible();
  await feedback.locator('select[name="state"]').selectOption("recorded");
  await feedback.locator('input[name="rpe"]').fill("6");
  await feedback.locator('textarea[name="fatigue"]').fill("合成测试：记录疲劳");
  await feedback.locator('textarea[name="change_reason"]').fill("合成测试补录");
  await feedback.locator('button[type="submit"]').click();
  await expect(page.getByText("第 2 版", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("第 1 版", { exact: false })).toBeVisible();
  await expect(page.getByText("第 2 版", { exact: false })).toBeVisible();

  await page.goto(participantPath);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "下载编号化 CSV" }).click(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const csv = await readFile(downloadPath!, "utf8");
  expect(csv).toContain(code);
  expect(csv).toContain("training_session");
  expect(csv).toContain("training_feedback_revision");
  expect(csv).toContain("safety_event");
  expect(csv).not.toContain("合成测试事件：训练中断");

  const other = await browser.newPage();
  await other.goto("/login");
  await other.locator('input[name="email"]').fill("demo-clinician-b@example.org");
  await other.locator('input[name="password"]').fill(password);
  await other.locator('form button[type="submit"]').click();
  await expect(other).toHaveURL(/\/workspace$/);
  const denied = await other.request.get(
    `/api/v1/training-sessions/${sessionPath.split("/").at(-1)}/feedback`,
  );
  expect(denied.status()).toBe(403);
  const deniedExport = await other.request.get(
    `/api/v1/participants/${participantPath.split("/").at(-1)}/research-export.csv`,
  );
  expect(deniedExport.status()).toBe(403);
  await other.goto(sessionPath);
  await expect(other).toHaveURL(/\/training\/[0-9a-f-]+$/);
  await expect(other.getByText("合成测试补录")).toHaveCount(0);
  await other.close();
});
