# 当前交接检查点

更新时间：2026-11-11 北京时间（DEMO-V2-17 检查点）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-publication-readiness` 从 `d029c12` 建立；本次检查点以实际 `git log -1` 为准。原 `codex/demo-patient-card-selection` 及其中提交保留；未推送或合并 main。 |
| 最近独立任务 | `DEMO-V2-17`：医护对象页显示模拟同意、合成患者绑定及读取失败状态，可重新检查发布条件；原服务端发布门禁不变。视频继续待添加、不可播放。 |
| 验证 | 后端 Ruff/54 passed、4 skipped；隔离前端 lint/typecheck/27 tests/build；一次性 PostgreSQL→Chromium 10 passed 及本次临时资源清理。本机仅重建合成 Demo 前后端，保留数据库卷，登录/ready 均 200；远端 CI 未在本分支运行。本机前端依赖缺失导致的测试/typecheck 失败不计入通过证据。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。本机共享演示站点已部署本分支，临时外网网址未部署/验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | 视频按用户本轮要求暂跳过：`DEMO-V2-16` 仍因无可核验授权的非指导性合成视频而 BLOCKED。可独立处理 `ENG-04` 红色远端失败附件上传的隔离验证，或继续拆分合成患者/医护易用性任务；正式临床审核、方案训练与冻结快照仍受审批阻断。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
