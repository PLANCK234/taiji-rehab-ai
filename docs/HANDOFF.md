# 当前交接检查点

更新时间：2026-11-11 北京时间（ENG-04I 检查点）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-patient-report-order` 已推送至同名 origin 分支，代码提交 `ce964bc` 的远端 CI 通过；本次仅新增本地验收文档检查点，实际 HEAD 与远端差异以 `git status` 为准。原功能分支和 main 均保留，未合并 main。 |
| 最近独立任务 | `ENG-04I`：累积合成双端代码分支远端五作业验收通过；`DEMO-V2-22` 的排序在该提交内。视频待添加。 |
| 验证 | [Actions 42953445347](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42953445347) 对 `ce964bc` 整体成功：backend 58 passed、frontend 33 tests、ML/docs 成功、隔离 Chromium 10 passed、清理契约 5 tests，日志确认临时容器/网络/镜像消失，失败附件为空。本机站点仍为该代码，`/login` 与 `/ready` 均 200。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。本机共享演示站点已部署本分支，临时外网网址未部署/验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `ENG-04I` 已完成。可考虑 `ENG-04J` 工程候选：核对本次 CI 日志中 GitHub Actions Node.js 20 弃用提示与官方 Action 版本后，再决定是否升级工作流；尚未立项或更改工作流。视频依用户要求暂跳过，`DEMO-V2-16` 仍因无合格素材 BLOCKED；正式临床审核、方案训练与冻结快照仍受审批阻断。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
