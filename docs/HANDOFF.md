# 当前交接检查点

更新时间：2026-11-01 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `feat/real-01f0-coded-export`，任务开始 HEAD `b81aa58`；完成检查点以 `git log -1` 为准。本次未推送或合并 main。 |
| 最近独立任务 | `DEMO-V2-00..07`：研究人员可操作的合成数据库训练演示，见 [流程](product/DEMO_USER_FLOW.md)、[ADR-0014](decisions/0014-isolated-demo-rule-and-run.md)。旧 REAL-01F0、REAL-01D0 状态保持不变。 |
| 验证 | 后端 Ruff、pytest 42 passed/4 opt-in skipped；临时 PostgreSQL 迁移升/降/升与旧 API 5 passed；Node 26 容器前端 lint/typecheck/21 tests/build；真实 PostgreSQL→FastAPI→Next→Chromium 7 passed（含旧业务、越权、8/5 分、实际完成动作/反馈/中止/刷新）。本机现有合成卷从 `0004` 向前升至 `0007`，旧对象 4 条仍在；预迁移备份 `exports/demo-v2-pre.dump`（Git 忽略），动作 12 条。`http://127.0.0.1:3000/login` 和 ready 200 已实测。 |
| 当前缺口 | DEMO-V2 动作仅文字/占位示意，无临床审核、获批剂量或真实影像；完成动作可选记录但无单独更正入口。REAL-01A/B/C 仍只有合成子集；E 周期/快照、F 完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01E0`：手工研究周期容器与人工复评/训练观察显式关联；不自动安排访视、不定义结局或临床规则。若继续 DEMO-V2 优化，先补实际完成动作的更正入口及独立使用测验。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
