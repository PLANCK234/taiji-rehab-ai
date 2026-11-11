# 当前交接检查点

更新时间：2026-11-11 北京时间（DEMO-V2-19 检查点）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-patient-report-time` 从 `62dd00a` 建立；本次检查点以实际 `git log -1` 为准。原 `codex/demo-patient-report-history` 与更早分支保留。本新分支未推送或合并 main。 |
| 最近独立任务 | `DEMO-V2-19`：合成患者自报时间的输入、历史和更正预填统一为北京时间，未改时间保留原始精度。`DEMO-V2-18` 完整历史继续保留；视频待添加。 |
| 验证 | 隔离前端 lint/typecheck/30 tests/build，洛杉矶设备时区定向组件 3 passed；一次性 PostgreSQL→Chromium 10 passed，含患者填写、更正预填和刷新，本次临时资源清理成功。本机只重建前端，`/login` 与 `/ready` 均 200，原数据库卷未动。后端代码未改，本分支远端 CI 未运行。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。本机共享演示站点已部署本分支，临时外网网址未部署/验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-19` 已完成。视频依用户要求暂跳过，`DEMO-V2-16` 仍因无可核验授权的非指导性合成视频而 BLOCKED。下一步可检查工作人员查看患者自报时的时间标注与一致性，先核对实际代码并另立合成任务；正式临床审核、方案训练与冻结快照仍受审批阻断。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
