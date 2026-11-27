# 实施状态

> 本文件只记录**当前**状态。2026-10-30 至 2026-11-26 的逐任务验证日志已移至 [STATUS_HISTORY](archive/STATUS_HISTORY.md)。

更新：2026-11-26 · 分支 `feat/ux-refresh` · 迁移头 `0011_pose_v3_free_text_reasons`

## 能做什么（合成数据 Demo）

| 模块 | 状态 | 说明 |
|---|---|---|
| 登录 / RBAC / 审计 | DONE | Argon2 登录、会话 + CSRF、对象级授权；登录页显示后端连接状态与演示账号快填 |
| 编码建档 + 模拟同意 | DONE | 一张表单：只填编号 → 建档；勾选同意 → 同时记录同意；再填 SPPB → 一步生成 Demo 分级与方案 |
| 人工 SPPB 总分 | DONE | 草稿 / 确认 / 追加更正；零分 ≠ 缺失 ≠ 无效；更正原因为自由文本（≤240 字，不进入导出） |
| Demo 分级与方案 | DONE | `demo-rule-v1`（10–12 Ⅰ / 7–9 Ⅱ / 4–6 Ⅲ / 0–3 Ⅳ），`DEMO_ONLY`；12 个动作含完整要领与步骤 |
| 训练运行 | DONE | 开始/暂停/继续/上下动作/两步确认中止/结束/反馈/完成，刷新可恢复 |
| 训练观察 / 反馈 / 事件 | DONE | 追加版本，缺失不当作 0；事件可在反馈前单独报告 |
| 编号化 CSV 导出 | DONE | 单对象实时导出，不含自由文本与身份信息，附 SHA-256 |
| AI 视频动作评估 | DONE（工程） | 浏览器本地 MediaPipe 33 点 → 后端 `pose-geometry-v3`：6 关节角度/幅度、平滑与噪声、**躯干倾斜、骨盆左右/上下移动、左右幅度差** → 人工复核（可逐项修正） |
| 微信小程序 | 准备中 | 设计令牌与页面映射见 [设计系统](product/DESIGN_SYSTEM.md)、[小程序方案](product/MINIPROGRAM_PLAN.md) |

## 最近验证（2026-11-26，本分支）

- 后端：`uv run ruff check .` 通过；`uv run pytest` **77 passed / 6 opt-in skipped**；OpenAPI 快照已重新生成。
- PostgreSQL 门禁 `scripts/run_eng04_integration.py`：临时库迁移升→check→降→升（含 0011）及 PG 测试 **7 passed**。
- 前端：lint、typecheck、单元测试 **28 passed**。
- 真实浏览器 `scripts/run_pose_browser.py`（真实模型 → Next 生产构建 → FastAPI → 临时 PostgreSQL）：pose / demo-v2 / training / real-business **12 passed**。桌面 1366px 与手机 390px 截图已人工检查。
- 本机 Chrome 运行需设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`；单独跑某个用例可设 `E2E_SPECS="demo-v2.real.ts"`。

## 未完成 / 阻断

- **临床**：S3-01 仍 BLOCKED（Q-03 适配模板/禁忌/剂量、Q-09 发布责任人未签核）。Demo 分级与动作不是处方。
- **AI**：没有 SPPB 自动评分、康复阶段或动作标准分（需 Q-14 评分表、Q-15 阶段模板）；v3 指标是图像平面描述量，尚无人体视频精度验证；实体手机/遮挡/辅具场景未测。
- **真实数据**：Research 配置关闭；伦理、同意、安全与部署审批均未在仓库中记录。
- **小程序**：尚未建工程；需要先加 token 鉴权（见方案文档）。

下一步见 [HANDOFF](HANDOFF.md)。
