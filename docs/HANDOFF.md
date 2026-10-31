# 当前交接检查点

更新时间：2026-10-31 UTC。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 从 `9ea36c8`（当时 `origin/main`）先后保存 `REAL-01P=5b63d93`、`REAL-01D0=31ed502`，当前分支 `feat/real-01f0-coded-export`。实际 HEAD 以 `git rev-parse HEAD` 为准。工作树原有未知所有者的 `.vscode/`，本任务未触碰。 |
| 最近独立任务 | `REAL-01F0`：单对象编号化实时 Demo CSV、行数/哈希/审计/越权拒绝，见 [ADR-0013](decisions/0013-live-coded-demo-export.md)。前序 P/D0 检查点见 [STATUS](STATUS.md)、[TASKS](TASKS.md)。 |
| 验证 | 后端 Ruff、pytest 32 passed/4 opt-in skipped；临时 PostgreSQL 迁移升/降/升、Alembic check 与 5 个 API 测试；Node 容器前端 lint/typecheck/21 tests/build；实际 Chromium 4 passed，含 CSV 浏览器下载与跨对象拒绝；Demo/Research Compose config。Research 服务/数据库未启动或迁移。 |
| 当前缺口 | REAL-01A/B/C 仅有合成流程子集；D0 不含周期/规则关联或处方；E 周期/快照和 F 完整研究级导出/工作台未完成。F0 是实时单对象 Demo 下载，不是冻结数据集；事件只存事实，不做通知、SAE/严重度定性或处置闭环。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01E0`：建立手工研究周期容器与人工复评/训练观察的显式关联，允许缺失/更正并沿用现有只读趋势；不自动安排访视、不定义结局或临床规则。此后扩展 REAL-01C 多指标和 REAL-01F 冻结研究数据集。 |
| 下一步文件 | [PRD](product/PRD.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)、`backend/app/{models,assessment_api,training_api}.py`、`frontend/app/participants/[id]/page.tsx`；先检查嵌套 AGENTS。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
