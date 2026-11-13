# 当前交接检查点

更新时间：2026-11-13 北京时间（DEMO-V2-25 检查点）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-patient-report-order`，功能提交 `f54354f` 与 CI 重试 `892137a` 已推送；本次验收文档检查点保留本地，实际 HEAD/差异以 Git 为准。未合并 main。 |
| 最近独立任务 | `DEMO-V2-25`：登录密码可显示/隐藏，切换演示账号时清空并恢复隐藏。 |
| 验证 | 本机隔离前端 lint/typecheck/34 tests/build、Chromium 10 passed，资源清理；本机 `/login`、`/ready` 200 且新控件可见。远端 [43251807605](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/43251807605) 与重试 [43254096767](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/43254096767) 均零步骤失败；check-run annotation 明确为 GitHub 账户因账单问题锁定，记为外部 CI 阻断。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。本机共享演示站点已部署本分支，临时外网网址未部署/验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-25` 已完成。下一工程任务需按实际页面和台账重新选择；先由账户所有者解决 GitHub 账单锁定并核对 Actions 恢复，避免无效重复推送。视频 `DEMO-V2-16` 仍待可核验授权的素材，真实患者与临床功能受原审批阻断。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
