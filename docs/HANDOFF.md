# 当前交接检查点

更新时间：2026-11-18 北京时间（S6-19 五次坐站计时复核）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-patient-report-order`；S6-19 起点为 `138251c`，最终 HEAD 以实际 Git 为准。未合并 main。 |
| 最近独立任务 | `S6-19` 复用姿态实验室完成五次坐站人工起止、程序候选用时比较、未知原因与经确认的本地 CSV。 |
| 验证 | S6-19 前端 lint、typecheck、69 项测试、生产构建及隔离 Chromium 17 项通过。隔离资源已清理，本机登录页返回 200。 |
| 当前缺口 | 已有两段本机开发视频和候选计次，仍待独立样本、标准人工标注协议、可比参考角、正式计时一致性、SPPB 分项计分和太极动作评分。真实医护计划发布、审核视频、患者异常处置及其他 REAL 父任务缺口由原任务跟踪。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED。Q-01/Q-10 的真实影像目的、同意、留存和权限未批准；S6-03 不解除它们。Q-03/Q-09 等临床规则/发布责任同样未签核；Research 默认拒绝。 |
| S6-04 检查点 | [本机验证报告](testing/S6-04-5STS-LOCAL-VALIDATION.md)保留两组直立时间及按初查循环窗口抽取的模型角峰。第 1、4 次标注存在差异。独立计次/事件计时、可比参考角及太极样本待补。 |
| 下一 Task ID | `S6-04`。按团队确认的口径使用含可核实起点的获授权独立样本，先做人工计时，再比程序候选。太极关键动作清单及评分口径由用户向团队确认。 |
| 下一步文件 | [姿态原型](product/POSE_PROTOTYPE.md)、[本机坐站验证](testing/S6-04-5STS-LOCAL-VALIDATION.md)、[待决事项](OPEN_QUESTIONS.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
