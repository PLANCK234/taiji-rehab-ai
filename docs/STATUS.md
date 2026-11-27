# 实施状态

> 本文件只记录**当前**状态。旧的逐任务验证日志：AI 姿态分支见 [STATUS_HISTORY](archive/STATUS_HISTORY.md)，团队主分支见 [STATUS_HISTORY_MAIN](archive/STATUS_HISTORY_MAIN.md)。

更新：2026-11-26 · PR #10 已合并 main `5ea8c44`；分支 `feat/sppb-measure-v1` · 迁移头 `0024_sppb_measurements`（只在隔离测试库应用）

DEMO-V2-64/65 DONE：AI页可从已存骨架生成五次坐站候选用时，人工指定起点、修正/重测并保留独立版本；含数据库持久化、分页、失败重试和冲突恢复。[接口证据](testing/SPPB_SERVICE_VALIDATION.md) / [网页证据](testing/SPPB_UI_VALIDATION.md)。[PR #11](https://github.com/PLANCK234/taiji-rehab-ai/pull/11)仍为草稿，尚未合并；新提交CI不以旧基线代替。没有量表分或评估草稿副作用。

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
| 五次坐站候选计时 | DONE（合成） | 已存骨架→候选计时→人工起止复核；AI/人工分存，支持分页/刷新/失败重试；不自动换算SPPB分 |
| 患者端（四步流程） | DONE（合成） | 患者账号、发布卡片与教学视频、本机摄像预览、自报反馈与离开保护（团队主分支） |
| 医护发布 / 自报复核 / 周期 / 人员管理 | DONE（合成） | 合成卡片发布与撤回、患者自报复核、训练时间线与合成周期、`/admin` 人员授权（团队主分支） |
| 本地视频姿态实验室 | 开关启用 | `POSE_PROTOTYPE_ENABLED=true` 时出现；坐站计时对照（团队主分支） |
| 微信小程序 | 准备中 | 设计令牌与页面映射见 [设计系统](product/DESIGN_SYSTEM.md)、[小程序方案](product/MINIPROGRAM_PLAN.md) |

## 最近验证（2026-11-26，本地）

- 后端Ruff通过，pytest **125 passed / 8 opt-in skipped**；OpenAPI快照已生成。
- 隔离PostgreSQL迁移0001→0024升/check/空库降/升、带旧数据升级及拒绝破坏性回退；PG测试 **9 passed**，含真实并发201/409。
- 前端lint/typecheck通过，**141 tests / 36 files**；Next生产构建通过。
- 全套真实浏览器 **25 passed**，含模型识别、旧训练/患者流程和坐站网页；1366/390截图已查看，无横向溢出，本面板按钮≥44px。固定3000端口127登录用例沿用[A0 Docker证据](testing/PR10-MERGE-VALIDATION.md)，本轮未重复。
- 本机 Chrome 运行需设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`；单独跑某个用例可设 `E2E_SPECS="demo-v2.real.ts"`。远端 CI 尚未运行。

## 未完成 / 阻断

- **临床**：S3-01 仍 BLOCKED（Q-03 适配模板/禁忌/剂量、Q-09 发布责任人未签核）。Demo 分级与动作不是处方。
- **AI**：没有 SPPB 自动评分、康复阶段或动作标准分（需 Q-14 评分表、Q-15 阶段模板）；v3 指标是图像平面描述量，尚无人体视频精度验证；实体手机/遮挡/辅具场景未测。
- **真实数据**：Research 配置关闭；伦理、同意、安全与部署审批均未在仓库中记录。
- **小程序**：尚未建工程；需要先加 token 鉴权（见方案文档）。

下一步见 [HANDOFF](HANDOFF.md)。
