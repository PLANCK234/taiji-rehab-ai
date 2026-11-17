# 当前交接检查点

更新时间：2026-11-17 北京时间（S6-04 单样本目视时间对照）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-patient-report-order`；S6-14 前一提交为 `66e9ac2`，最终 HEAD 以实际 Git 为准。未合并 main。 |
| 最近独立任务 | `S6-14` DONE：已有人工标注可在保留原时刻时编辑；保存替换不重复并重算新关节模型角，取消不改变记录。`S6-04` 仍为 IN_PROGRESS。 |
| 验证 | 前端 lint/typecheck/58 tests、Next 生产 build；共享本机 PostgreSQL→FastAPI→Next→Edge 对 `SYN-5STS-001` 编辑 4.0 秒事件，保持 1 行/1 标记并重算右髋模型角 164.5°，取消保持原值，无非 GET 请求。 |
| 当前缺口 | 已有一个五次坐站运行样本、描述性角度曲线、时间联动、人工标记呈现及本地 CSV 恢复，但仍没有标准人工标注协议、人工参考角、时间/角度误差、获验证自动次数/阶段、太极样本、相机标定、Research 持久化或临床评分。导入的人工事件不等于验证真值。真实医护确认计划、审核视频、患者异常处置及其他 REAL 父任务缺口不变。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED。Q-01/Q-10 的真实影像目的、同意、留存和权限未批准；S6-03 不解除它们。Q-03/Q-09 等临床规则/发布责任同样未签核；Research 默认拒绝。 |
| S6-04 检查点 | [本机验证报告](testing/S6-04-5STS-LOCAL-VALIDATION.md)保留两组直立时间及按初查循环窗口抽取的模型角峰。第 1、4 次标注存在差异。独立计次/事件计时、可比参考角及太极样本待补。 |
| 下一 Task ID | 继续 `S6-04`。髋膝模式已支持按配对覆盖选侧，两段现有样本复跑通过。下一步采集一段获授权新素材，先独立记录目视时间与次数，再比对程序输出。参考角和太极样本待补。 |
| 下一步文件 | [姿态原型](product/POSE_PROTOTYPE.md)、[PRD](product/PRD.md)、[验收](product/ACCEPTANCE.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
