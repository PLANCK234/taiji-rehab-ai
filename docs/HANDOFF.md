# 当前交接检查点

更新时间：2026-10-31 UTC。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 从 `9ea36c8`（当时 `origin/main`、含 ENG-04B 测试文件的合并提交）创建 `feat/real-01-profile-isolation`。实际 HEAD 以 `git rev-parse HEAD` 为准。先前 HANDOFF 指向 `adf019a` 的 ENG-03A 分支，已过时。工作树原有未知所有者的 `.vscode/`，本任务未触碰。 |
| 最近独立任务 | `REAL-01P`：Demo/Research 逻辑环境和 PostgreSQL 资源隔离、Research 业务/种子/迁移关闭。完成证据在 [STATUS](STATUS.md)、[TASKS](TASKS.md)、[ADR-0011](decisions/0011-demo-research-profile-boundary.md)。 |
| 验证 | 后端 Ruff 通过、pytest 30 passed/2 opt-in skipped；临时 PostgreSQL 迁移/API 3 passed；双 Compose config 通过；交接链接/Task ID 检查待最终执行。未启动 Research 服务或迁移其数据库。 |
| 当前缺口 | REAL-01A/B/C 仅有合成流程子集；D 训练反馈、E 周期快照、F 导出未完成。ENG-04B 测试文件在基线内但本次未声称其浏览器 E2E 通过。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01D`：先做非临床训练会话与结构化反馈持久化（含独立风险事件记录入口），在既有 Demo 合成对象权限/同意边界之内；不得自动推荐训练、设定剂量或判断不适安全性。随后接 `REAL-01E` 周期和 `REAL-01F` 趋势/导出。 |
| 下一步文件 | [PRD](product/PRD.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)、`backend/app/{models,intake_api,assessment_api}.py`、`frontend/app/participants/[id]/page.tsx`；先检查嵌套 AGENTS。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
