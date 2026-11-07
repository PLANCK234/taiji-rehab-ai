# 当前交接检查点

更新时间：2026-11-07 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/real-01b0-synthetic-profile-revisions`，从 `codex/real-01a-synthetic-staff-admin` 的 `7369690` 建立；本次检查点提交以实际 `git log -1` 为准。功能分支已推送；未合并 main。 |
| 最近独立任务 | `ENG-04D` 增加隔离浏览器脚本本次容器/网络/镜像清理后核对，并把清理契约测试接入 CI。 |
| 验证 | ENG-04C 的[远端 Actions #19](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42356649612) 5 作业通过。ENG-04D 本地清理单测 4 passed、Ruff、完整 Chromium 10 passed 且输出资源已消失；更新后的远端 Actions 待运行。 |
| 当前缺口 | 真实身份映射、正式同意签署、完整业务档案字段与机构账号治理仍待批准/实现；REAL-01A/B 父任务 IN_PROGRESS。真实医护确认计划、审核视频、患者异常处置未完成。现有本机共享演示站点与临时外网网址未部署本分支；有效账号外网登录尚未验收。REAL-01C 仍只有合成子集；正式周期日程/冻结快照与完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `ENG-04D` 待更新后的远端 CI 验收；随后 `ENG-04` 父任务的完整业务 E2E 和新会话恢复范围另行核对。ENG-02 正式周期完成率仍缺获批分母，REAL-01F 真实导出仍受审批。当前台账无其他已登记、依赖满足且未分配的独立业务任务。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
