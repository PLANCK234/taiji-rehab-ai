# 当前交接检查点

更新时间：2026-11-10 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-patient-card-selection` 从 `f5abe1b` 建立；本次检查点以实际 `git log -1` 为准。本分支尚未推送或合并 main，原 `codex/real-01b0-synthetic-profile-revisions` 保留。 |
| 最近独立任务 | `DEMO-V2-15`：两张非指导合成卡片供医护选择并明确演示确认；发布历史保存卡片标题快照，患者本人查看当前所选卡片。视频仍待审核、不可播放。 |
| 验证 | 后端 Ruff/53 passed、4 skipped；前端完整依赖 build/lint/typecheck/25 tests；一次性 PostgreSQL 5 passed、隔离 Chromium 10 passed 及资源清理。共享本机 Demo 先备份后迁移到 `0015`，原有对象 9/评估 4/发布 5 行数保持，登录/ready 成功。远端 CI 尚未在本新分支运行。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。本机共享演示站点已部署本分支，临时外网网址未部署/验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | 患者产品方向 `DEMO-V2-16` 需先确定可用的合成视频素材与审核边界；无素材时只能保持待审核，真实视频另待 Q-15。独立工程方向 `ENG-04` 父任务仍 IN_PROGRESS，红色远端失败附件上传待安全隔离验证。正式临床审核、方案训练与冻结快照仍受审批阻断。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
