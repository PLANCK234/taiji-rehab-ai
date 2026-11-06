# 当前交接检查点

更新时间：2026-11-06 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/real-01e0-synthetic-cycles`，从 `codex/demo-patient-report` 的 `67d3626` 建立；本次检查点提交以实际 `git log -1` 为准。未推送或合并 main。 |
| 最近独立任务 | `REAL-01E0`：手工合成周期、访视和已有评估/训练观察关联；追加修订及对象页持久展示。仅合成工程子集，无获批日程。 |
| 验证 | 后端 Ruff、pytest 47 passed/4 skipped；前端隔离 Docker lint/typecheck/24 tests/build；临时 PostgreSQL 升/空库降/升、Alembic check 与旧 API 5 passed；实际 Chromium 最终 8 passed，含周期/访视关联、更正、当前值和刷新。两次中途测试定位失败及附件见 STATUS，均已修正并复跑全过。 |
| 当前缺口 | 真实医护确认计划和审核视频素材均未实现；患者异常处置未设计。现有本机共享演示站点尚未部署本分支，临时外网网址仍是旧版本。临时域名依赖本机/Docker/隧道，不保证长期可用；有效账号外网登录尚未验收。REAL-01A/B/C 仍只有合成子集；正式 E 周期日程/冻结快照、F 完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01A`：合成工作人员与研究/对象授权管理，先核对现有角色和审计；真实身份导入仍待机构批准。`REAL-01E` 的正式方案日程/冻结快照仍依赖 Q-05/Q-06。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
