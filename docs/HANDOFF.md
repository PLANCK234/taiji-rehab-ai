# 当前交接检查点

更新时间：2026-11-07 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/real-01b0-synthetic-profile-revisions`，从 `codex/real-01a-synthetic-staff-admin` 的 `7369690` 建立；本次检查点提交以实际 `git log -1` 为准。功能分支已推送；未合并 main。 |
| 最近独立任务 | `ENG-04G` 为构建/迁移/启动等早期失败预先创建本次合成附件目录，并写不含命令或密码的阶段摘要。 |
| 验证 | 本地 5 项清理/早期失败测试与 Ruff 通过；未提权受控 buildx 失败确实生成 `failure.txt`，完整隔离 Chromium 10 passed 且资源已清理；[远端 Actions #26](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42374281253) 5 作业、5 项脚本测试、10 项浏览器测试与清理均通过。GitHub 红色运行的失败上传动作尚未实测。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。现有本机共享演示站点与临时外网网址未部署本分支；有效账号外网登录尚未验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `ENG-04` 父任务仍 IN_PROGRESS：A–G 的合成/工程子范围已验收；失败上传动作的远端演练须先设计安全隔离方案。正式临床审核、方案训练和冻结快照继续受审批阻断，不能据 Demo 子范围标记父任务 DONE。ENG-02 正式周期完成率仍缺获批分母，REAL-01F 真实导出仍受审批；当前无其他已登记且依赖满足的独立业务任务。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
