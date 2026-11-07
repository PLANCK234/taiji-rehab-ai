# 当前交接检查点

更新时间：2026-11-07 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/real-01b0-synthetic-profile-revisions`，从 `codex/real-01a-synthetic-staff-admin` 的 `7369690` 建立；本次检查点提交以实际 `git log -1` 为准。未推送或合并 main。 |
| 最近独立任务 | `REAL-01C1` 合成四指标原始观察、追加更正和对象页，完成 C0 契约限定的工程子集；独立于旧 SPPB 分级。仅 Demo 合成数据，旧 CSV 未纳入新观察。 |
| 验证 | 后端 Ruff、pytest 52 passed/4 skipped；前端完整依赖容器 build/lint/typecheck/24 tests；临时 PostgreSQL 升/空库降/升、Alembic check 与旧 API 5 passed；实际隔离 Chromium 最终 10 passed，含原始观察保存、更正、刷新。本机 typecheck 因 node_modules 缺少测试依赖失败，容器内通过。失败附件与修正见 STATUS。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。现有本机共享演示站点与临时外网网址未部署本分支；有效账号外网登录尚未验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01F1`：将新增合成原始观察及其版本、缺失/单位纳入编号化导出；只处理 Demo 合成数据，先核对既有 CSV 契约与权限。父任务 REAL-01C/F 仍未完成，正式量表和真实导出等待审批。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
