# 当前交接检查点

更新时间：2026-11-05 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/real-01e0-synthetic-cycles`，从 `codex/demo-patient-report` 的 `67d3626` 建立；本次检查点提交以实际 `git log -1` 为准。未推送或合并 main。 |
| 最近独立任务 | `REAL-01E0` 进行中：手工周期与追加式访视后端检查点；患者任务 `DEMO-V2-13` 已完成。 |
| 验证 | 后端 Ruff、pytest 46 passed/4 skipped；前端隔离 Docker lint/typecheck/24 tests/build；真实 PostgreSQL/Chromium 8 passed（含患者填写、更正及医护查看）；临时 PostgreSQL 升/空库降/升及 Alembic check、旧 API 5 passed。最终文档/差异检查见 STATUS 和 SESSION_LOG。 |
| 当前缺口 | 真实医护确认计划和审核视频素材均未实现；患者异常处置未设计。现有本机共享演示站点尚未部署本分支，临时外网网址仍是旧版本。临时域名依赖本机/Docker/隧道，不保证长期可用；有效账号外网登录尚未验收。REAL-01A/B/C 仍只有合成子集；E 周期/快照、F 完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | 继续 `REAL-01E0`：补对象页手工周期/访视及评估和训练关联、新关联 PostgreSQL/浏览器验收；当前仅后端检查点，不能标 DONE。患者正式计划和视频仍受 Q-03/Q-09/Q-15 阻断。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
